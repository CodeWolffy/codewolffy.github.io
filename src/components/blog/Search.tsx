import * as React from "react"
import { Search as SearchIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function Search() {
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Initialize Pagefind when dialog opens
    React.useEffect(() => {
        if (open) {
            // @ts-ignore
            if (window.PagefindUI) {
                const searchDiv = document.getElementById("search");
                if (searchDiv) {
                    searchDiv.innerHTML = ""; // Clear previous instance
                    // @ts-ignore
                    new PagefindUI({
                        element: "#search",
                        showSubResults: true,
                        showImages: false,
                        autofocus: true
                    });
                }
            } else {
                console.warn("PagefindUI not found. Search requires a production build.");
                const searchDiv = document.getElementById("search");
                if (searchDiv) {
                    searchDiv.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                            <p>搜索功能仅在生产构建（Build/Preview）模式下可用。</p>
                            <p class="text-xs">因为 Pagefind 需要在构建时生成索引。</p>
                            <p class="text-xs font-mono bg-muted px-2 py-1 rounded">npm run build && npm run preview</p>
                        </div>
                     `;
                }
            }
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64">
                    <SearchIcon className="mr-2 h-4 w-4" />
                    <span className="inline-flex">搜索...</span>
                    <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </Button>
            </DialogTrigger>
            <DialogContent className="p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div id="search" className="p-4 bg-background"></div>
            </DialogContent>
        </Dialog>
    )
}

// Logic to load Pagefind UI script
// In a real implementation with Astro, we typically include the pagefind stylesheet and script in the head
// or use the pagefind-ui library.
// For this simple implementation, we will rely on the pagefind default UI which is easiest to integrate.
