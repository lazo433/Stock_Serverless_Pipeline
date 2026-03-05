const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export async function getTopMovers() {
    const res = await fetch(`${apiBaseUrl}/movers`);
    return res.json();
    
}