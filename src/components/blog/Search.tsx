import * as React from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

// 声明 PagefindUI 类型
declare global {
    interface Window {
        PagefindUI?: new (options: {
            element: string;
            showSubResults?: boolean;
            showImages?: boolean;
            autofocus?: boolean;
        }) => void;
    }
}

const PAGEFIND_CSS_ID = "pagefind-ui-css";
const PAGEFIND_SCRIPT_ID = "pagefind-ui-script";
let pagefindAssetPromise: Promise<void> | null = null;

function loadPagefindAssets() {
    if (window.PagefindUI) {
        return Promise.resolve();
    }

    if (!import.meta.env.PROD) {
        return Promise.reject(new Error("Pagefind is only available after production build."));
    }

    if (pagefindAssetPromise) {
        return pagefindAssetPromise;
    }

    pagefindAssetPromise = new Promise<void>((resolve, reject) => {
        if (!document.getElementById(PAGEFIND_CSS_ID)) {
            const link = document.createElement("link");
            link.id = PAGEFIND_CSS_ID;
            link.rel = "stylesheet";
            link.href = "/pagefind/pagefind-ui.css";
            document.head.appendChild(link);
        }

        const resolveIfReady = () => {
            if (window.PagefindUI) {
                resolve();
            } else {
                reject(new Error("Pagefind UI failed to initialize."));
            }
        };

        const existingScript = document.getElementById(PAGEFIND_SCRIPT_ID) as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener("load", resolveIfReady, { once: true });
            existingScript.addEventListener("error", () => reject(new Error("Pagefind UI failed to load.")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.id = PAGEFIND_SCRIPT_ID;
        script.src = "/pagefind/pagefind-ui.js";
        script.async = true;
        script.addEventListener("load", resolveIfReady, { once: true });
        script.addEventListener("error", () => reject(new Error("Pagefind UI failed to load.")), { once: true });
        document.head.appendChild(script);
    }).catch((error) => {
        pagefindAssetPromise = null;
        throw error;
    });

    return pagefindAssetPromise;
}

export function Search() {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")
    const [searchStatus, setSearchStatus] = React.useState<"idle" | "loading" | "ready" | "unavailable">("idle")
    const searchContainerRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Handle Cmd+K / Ctrl+K keyboard shortcut
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsExpanded(true)
                setTimeout(() => inputRef.current?.focus(), 100)
            }
            if (e.key === "Escape" && isExpanded) {
                setIsExpanded(false)
                setSearchValue("")
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [isExpanded])

    // Initialize Pagefind when expanded
    React.useEffect(() => {
        if (isExpanded) {
            // Small delay to ensure the container is rendered
            const timer = setTimeout(async () => {
                const searchResultsDiv = document.getElementById("pagefind-results");
                if (!searchResultsDiv) return;

                try {
                    setSearchStatus("loading");
                    await loadPagefindAssets();

                    if (!window.PagefindUI) {
                        throw new Error("Pagefind UI is unavailable.");
                    }

                    searchResultsDiv.innerHTML = ""; // Clear previous instance
                    new window.PagefindUI({
                        element: "#pagefind-results",
                        showSubResults: true,
                        showImages: false,
                        autofocus: false, // We handle focus ourselves
                    });
                    setSearchStatus("ready");

                    // Find the pagefind input and sync it with our controlled input
                    const pagefindInput = searchResultsDiv.querySelector('.pagefind-ui__search-input') as HTMLInputElement;
                    if (pagefindInput && searchValue) {
                        pagefindInput.value = searchValue;
                        pagefindInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } catch {
                    setSearchStatus("unavailable");
                    searchResultsDiv.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                            <p>搜索功能仅在生产构建模式下可用。</p>
                            <p class="text-xs">因为 Pagefind 需要在构建时生成索引。</p>
                            <p class="text-xs font-mono bg-muted px-2 py-1 rounded">npm run build && npm run preview</p>
                        </div>
                    `;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    // Sync search value to pagefind input
    React.useEffect(() => {
        if (isExpanded && searchValue) {
            const pagefindInput = document.querySelector('#pagefind-results .pagefind-ui__search-input') as HTMLInputElement;
            if (pagefindInput) {
                pagefindInput.value = searchValue;
                pagefindInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }, [searchValue, isExpanded]);

    // Click outside to close
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setIsExpanded(false)
                setSearchValue("")
            }
        }
        if (isExpanded) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isExpanded])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value)
    }

    const handleClear = () => {
        setSearchValue("")
        inputRef.current?.focus()
        const pagefindInput = document.querySelector('#pagefind-results .pagefind-ui__search-input') as HTMLInputElement;
        if (pagefindInput) {
            pagefindInput.value = "";
            pagefindInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    const handleSearchClick = () => {
        setIsExpanded(true)
        setTimeout(() => inputRef.current?.focus(), 100)
    }

    return (
        <div ref={searchContainerRef} className={cn(
            "transition-all duration-200 ease-in-out",
            isExpanded
                ? "fixed left-2 right-2 top-2.5 z-50 md:relative md:top-auto md:left-auto md:right-auto md:inset-auto md:w-full"
                : "relative w-9 md:w-full flex justify-end md:justify-start"
        )}>
            {/* Search Input Container */}
            <div
                className={cn(
                    "flex items-center h-9 rounded-md border border-input bg-background text-sm transition-all duration-200 shadow-sm",
                    isExpanded ? "w-full shadow-md md:shadow-none" : "w-9 px-0 justify-center border-transparent md:border-input md:w-full md:px-3 md:justify-start cursor-pointer"
                )}
                onClick={!isExpanded ? handleSearchClick : undefined}
            >
                <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="搜索文章..."
                    value={searchValue}
                    onChange={handleInputChange}
                    className={cn(
                        "flex-1 bg-transparent ml-2 outline-none placeholder:text-muted-foreground",
                        !isExpanded ? "hidden md:block pointer-events-none" : "block"
                    )}
                    readOnly={!isExpanded}
                />
                {isExpanded && searchValue && (
                    <button
                        onClick={handleClear}
                        className="p-1 hover:bg-accent rounded"
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
                {!isExpanded && (
                    <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isExpanded && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[70vh] overflow-auto">
                    <div id="pagefind-results" className="p-2">
                        {searchStatus === "loading" && (
                            <div className="py-8 text-center text-sm text-muted-foreground">正在加载搜索...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
