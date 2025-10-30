# Media Processing Service

This service exposes a Node.js Express API that provides a health check endpoint. Future media processing features can be added here.

## Setup

Run the following from the repository root:

```bash
cd mediaProcessing
npm install
```

The service requires `ffmpeg` to be installed and available on your system `PATH`.

### Authentication headers

The download flow expects a valid Referer and Cookie header. Provide them via environment variables when starting the service:

- `RESOURCE_SPACE_REFERER` (defaults to `https://ole.hkmu.edu.hk/`)
- `RESOURCE_SPACE_COOKIE` (defaults to `css_reload_key=242; cookiecheck=true`)

### Encoding profiles

Multi-bitrate HLS output is driven by `encoding-profiles.json`. Each profile defines resolution and bitrate settings (for example 1080p, 720p, 480p). Adjust the file to customise the renditions that will be produced.

## Running the service

From inside `mediaProcessing`:

```bash
npm start
```

For automatic reload during development:

```bash
npm run dev
```

The server listens on `PORT` (defaults to `3001`).

## Health Check

- `GET /health` – returns service status information.

## Media Download API

- `POST /media/download`
  - Body: `{ "ref": "30777" }`
  - Creates an asynchronous job that contacts the ResourceSpace endpoint, downloads the MP4 into `./temp/<ref>/mp4`, and produces multiple HLS renditions in `./temp/<ref>/hls`.
  - Response (HTTP 202) provides a `queryId` to poll:

    ```json
    {
      "queryId": "c1aa1d30-e8a1-4e6f-b9f5-f6b0c3c80c40",
      "status": "queued",
      "progressMessage": "Queued",
      "createdAt": "2024-06-01T12:34:56.789Z"
    }
    ```

- `GET /media/download/<queryId>/status`
  - Returns the current state of the job. `status` can be `queued`, `downloading`, `encoding`, `completed`, or `failed`.
  - On completion, paths to the generated assets are included:

    ```json
    {
      "queryId": "c1aa1d30-e8a1-4e6f-b9f5-f6b0c3c80c40",
      "ref": "30777",
      "status": "completed",
      "progressMessage": "Completed",
      "mp4": {
        "path": "/absolute/path/temp/30777/mp4/abcd.mp4",
        "filename": "abcd.mp4"
      },
      "hls": {
        "masterPlaylist": "/absolute/path/temp/30777/hls/master.m3u8",
        "variants": [
          {
            "name": "1080p",
            "playlistPath": "/absolute/path/temp/30777/hls/1080p/playlist.m3u8",
            "relativePlaylist": "1080p/playlist.m3u8",
            "bandwidth": 5192000,
            "resolution": "1920x1080"
          }
        ]
      }
    }
    ```

- Any characters outside `[a-zA-Z0-9-_]` in `ref` are replaced with `_` when creating the output directories.
