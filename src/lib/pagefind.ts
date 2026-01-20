// This script listens for the Search dialog to be open and initializes Pagefind UI
// Since Pagefind is a static search tool, it runs after build.
// To make it work, we will inject the Pagefind UI script.

window.addEventListener('DOMContentLoaded', () => {
    // Observer to detect when the #search div is available in the DOM (inside the Dialog)
    const observer = new MutationObserver((mutations) => {
        const searchDiv = document.getElementById('search');
        if (searchDiv && searchDiv.innerHTML === '') {
            // @ts-ignore
            new PagefindUI({
                element: "#search",
                showSubResults: true,
                showImages: false
            });
            observer.disconnect(); // Stop observing once initialized
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
