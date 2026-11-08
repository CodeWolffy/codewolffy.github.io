const singleByteRange = /^bytes=(\d*)-(\d*)$/;

function parseRange(value) {
  const match = singleByteRange.exec(value?.trim() ?? '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? BigInt(match[1]) : null;
  const end = match[2] ? BigInt(match[2]) : null;
  if (start !== null && end !== null && start > end) return null;
  return { start, end };
}

function resolveRange(range, size) {
  const length = BigInt(size);
  if (!length) return null;
  if (range.start === null) {
    if (!range.end) return null;
    return { start: Number(range.end >= length ? 0n : length - range.end), end: size - 1 };
  }
  if (range.start >= length) return null;
  return {
    start: Number(range.start),
    end: Number(range.end === null || range.end >= length ? length - 1n : range.end),
  };
}

function parseHttpDate(value) {
  // Accept the three HTTP-date formats, rather than Date.parse's arbitrary date strings.
  if (
    !value ||
    !/^(?:[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Z][a-z]+, \d{2}-[A-Z][a-z]{2}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/.test(
      value
    )
  ) {
    return NaN;
  }
  return Date.parse(value);
}

function matchesIfRange(value, headers) {
  if (!value) return true;
  const validator = value.trim();
  if (validator.startsWith('"')) {
    const etag = headers.get('etag');
    return /^"[^"\r\n]*"$/.test(validator) && etag === validator;
  }
  const requestedDate = parseHttpDate(validator);
  const modifiedDate = parseHttpDate(headers.get('last-modified'));
  // If-Range dates require an exact validator match, unlike If-Unmodified-Since.
  return Number.isFinite(requestedDate) && requestedDate === modifiedDate;
}

function withoutRange(request) {
  const headers = new Headers(request.headers);
  headers.delete('range');
  headers.delete('if-range');
  return new Request(request, { headers });
}

function sliceStream(body, start, end) {
  const reader = body.getReader();
  let position = 0;
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          const offset = position;
          position += value.byteLength;
          if (position <= start) continue;
          controller.enqueue(value.subarray(Math.max(0, start - offset), end + 1 - offset));
          if (position > end) {
            controller.close();
            await reader.cancel();
          }
          return;
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/** Serve an audio asset, using the platform's Range response before falling back to slicing. */
export async function fetchMusicAsset(request, env) {
  const range = request.method === 'GET' ? parseRange(request.headers.get('range')) : null;
  // Range is defined for GET. Ignore malformed/multiple ranges rather than inventing a 416.
  const assetRequest = request.headers.has('range') && !range ? withoutRange(request) : request;
  const response = await env.ASSETS.fetch(assetRequest);
  const headers = new Headers(response.headers);
  if (response.status === 200 || response.status === 206) headers.set('Accept-Ranges', 'bytes');
  if (request.method === 'HEAD') await response.body?.cancel();

  if (
    !range ||
    response.status !== 200 ||
    response.headers.has('content-range') ||
    !matchesIfRange(request.headers.get('if-range'), response.headers) ||
    (headers.has('content-encoding') && headers.get('content-encoding') !== 'identity')
  ) {
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const length = headers.get('content-length');
  let size = length !== null && /^\d+$/.test(length) ? Number(length) : NaN;
  let bytes;
  if (!Number.isSafeInteger(size) || size < 0) {
    // A length is necessary for suffix ranges and Content-Range. Buffer only when absent.
    bytes = await response.arrayBuffer();
    size = bytes.byteLength;
  }
  const selected = resolveRange(range, size);
  if (!selected) {
    if (!bytes) await response.body?.cancel();
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }

  headers.set('Content-Length', String(selected.end - selected.start + 1));
  headers.set('Content-Range', `bytes ${selected.start}-${selected.end}/${size}`);
  const body = bytes
    ? bytes.slice(selected.start, selected.end + 1)
    : response.body && sliceStream(response.body, selected.start, selected.end);
  return new Response(body, { status: 206, headers });
}
