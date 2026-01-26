const API = import.meta.env.VITE_API_BASE_URL;

export async function samSegment(file: File, prompt: any) {
  console.log(import.meta.env.VITE_API_BASE_URL) // debugger
  const fd = new FormData();
  fd.append("image", file);
  fd.append("prompt", JSON.stringify(prompt));

  const res = await fetch(`${API}/sam/segment`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob(); // image/png
  return URL.createObjectURL(blob);
}