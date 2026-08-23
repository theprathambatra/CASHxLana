(async () => {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  try {
    const names = [
      './final-video/p00a.txt',
      './final-video/p00b.txt',
      ...Array.from({ length: 14 }, (_, i) => `./final-video/p${String(i + 1).padStart(2, '0')}.txt`),
      './final-video/p15a.txt',
      './final-video/p15b.txt',
      './final-video/p16.txt',
    ];

    const parts = await Promise.all(
      names.map(async (url) => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.text();
      })
    );

    const base64 = parts.join('').replace(/\s+/g, '');
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
    video.src = objectUrl;
    video.load();
    video.play().catch(() => {});

    window.addEventListener('pagehide', () => URL.revokeObjectURL(objectUrl), { once: true });
  } catch (error) {
    console.warn('Sphere video could not be prepared', error);
  }
})();
