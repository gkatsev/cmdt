# CMDT (Common Media Diagnostics Tool)
CMDT is a CLI tool designed to help video engineers diagnose issues with DASH/HLS manifests and the (mp4) content within! Given a manifest, it will perform the following tasks:
- Parse the manifest
- Download all segments for all renditions (audio, video, thumbnails, captions) to filesystem
- Parse captions from all media files and write to filesystem
- Parse EMSG boxes from all media files and write to filesystem
- Check for CEA caption inconsistencies between video renditions
- Check for gaps between segments
- Run Apple's Media Stream Validator (optionally for HLS)

# Installation
## Pre-built binaries
Pre-built binaries for Linux, Windows, and MacOS are built as part of the release process. The latest release can be found [here](https://github.com/NBCUDTC/cmdt/releases/latest).

## Running from source
This is a typical node repo, for the most part. Once cloned, run the following:
```
nvm use
npm i -g pnpm
pnpm i
```

At this point, you should be able to run `pnpm start -h` and get the help output from the application. 

# Usage
```
Options:
  -m, --manifest <string>   Manifest URI. Can also be a local path.
  -o, --output <string>     Output directory (default: "download")
  -s, --skip-download       Skip download (debug)
  -v, --verbose             Verbose output
  --dash-conformance        Run DASH-IF conformance tool (DASH only)
  -t, --thumbnails          Validate thumbnails (check for duplicates)
  --media-stream-validator  Run apple's media stream validator (HLS only)
  -h, --help                display help for command
```

Typical usage is something like:
```
pnpm start -m "https://my-site/manifest.mpd" -o output
```

If you're running a pre-built binary, replace `pnpm start` with `./cmdt`. 

After running the tool, all output will be in a directory called `output`, as specified by the `-o` option.

## Report format
```typescript
type RawReport = {
	missingCues: {
		[representation: RepresentationId]: {
			[cue: string]: Array<RepresentationId>;
		};
	};
	duplicateThumbnails: {
		[representation: RepresentationId]: {
			[thumbnail: string]: Set<RepresentationId>;
		};
	};
	gaps: {
		[mediaType: string]: {
			[representation: string]: Array<{ expectedStartTime: number; previousSegment: Segment; segment: Segment }>;
		};
	};
	emsgs: {
		[representation: RepresentationId]: {
			segment: Segment;
			emsgs: Array<IEmsg>;
		};
	};
	manifest: Manifest;
};

export type Manifest = {
	video: Array<Representation>;
	audio: Array<Representation>;
	images: Array<Representation>;
	captionStreamToLanguage: Record<string, string>;
};
```

For more detailed info on `Manifest` content, see source. 