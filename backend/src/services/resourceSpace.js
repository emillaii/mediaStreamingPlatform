const DEFAULT_RESOURCE_SPACE_ENDPOINT = 'https://mmer.hkmu.edu.hk/resourcespace/pages/download_mp4.php';
const RESOURCE_SPACE_ENDPOINT = process.env.RESOURCE_SPACE_ENDPOINT ?? DEFAULT_RESOURCE_SPACE_ENDPOINT;
const RESOURCE_SPACE_REFERER = process.env.RESOURCE_SPACE_REFERER ?? 'https://ole.hkmu.edu.hk/';
const RESOURCE_SPACE_COOKIE =
  process.env.RESOURCE_SPACE_COOKIE ?? 'css_reload_key=242; cookiecheck=true';

export const fetchMediaDownloadUrl = async (ref) => {
  const normalizedRef = `${ref ?? ''}`.trim();

  if (!normalizedRef) {
    throw new Error('Media reference is required to fetch download URL');
  }

  const requestUrl = new URL(RESOURCE_SPACE_ENDPOINT);
  requestUrl.searchParams.set('ref', normalizedRef);
  requestUrl.searchParams.set('ext', 'mp4');
  requestUrl.searchParams.set('m', 'ajax');

  const response = await fetch(requestUrl, {
    headers: {
      Referer: RESOURCE_SPACE_REFERER,
      Cookie: RESOURCE_SPACE_COOKIE
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch media download URL (status ${response.status})`);
  }

  const payloadText = (await response.text()).trim();
  let parsed;

  try {
    parsed = JSON.parse(payloadText);
  } catch {
    parsed = payloadText;
  }

  const downloadUrl = typeof parsed === 'string' ? parsed.replace(/\\\//g, '/') : undefined;

  if (!downloadUrl || !downloadUrl.startsWith('http')) {
    throw new Error('Unexpected response when resolving media download URL');
  }

  return downloadUrl;
};
