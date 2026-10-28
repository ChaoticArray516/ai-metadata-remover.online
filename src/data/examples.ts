export const EXAMPLES = [
  {
    "id": "pixel-exif-basic",
    "file": "pixel-exif-basic.jpg",
    "format": "JPEG",
    "folded": false,
    "empty": false,
    "note": "Synthetic EXIF on a generated pixel image.",
    "bytes": 1236,
    "outputBytes": 804,
    "rows": [
      {
        "group": "EXIF / TIFF",
        "name": "APP1 (EXIF)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      }
    ]
  },
  {
    "id": "iphone-heic-makernote",
    "file": "iphone-heic-makernote.heic",
    "format": "HEIC",
    "folded": false,
    "empty": false,
    "note": "Synthetic MakerNote on a public libheif test image.",
    "bytes": 718587,
    "outputBytes": 718114,
    "rows": [
      {
        "group": "EXIF / TIFF",
        "name": "meta EXIF item",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      }
    ]
  },
  {
    "id": "sd-png-text-chunk",
    "file": "sd-png-text-chunk.png",
    "format": "PNG",
    "folded": false,
    "empty": false,
    "note": "Placeholder generation text in a PNG tEXt chunk.",
    "bytes": 320,
    "outputBytes": 261,
    "rows": [
      {
        "group": "Prompt & workflow text (AI generation settings)",
        "name": "tEXt (parameters)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": "Plain text, may contain your prompt"
      }
    ]
  },
  {
    "id": "c2pa-signed-manifest",
    "file": "c2pa-signed-manifest.jpg",
    "format": "JPEG",
    "folded": true,
    "empty": false,
    "note": "Public C2PA test asset from contentauth/c2pa-rs; its test signing chain is not a trust claim by this site.",
    "bytes": 166864,
    "outputBytes": 49591,
    "rows": [
      {
        "group": "Content Credentials (C2PA)",
        "name": "APP11 (JUMBF manifest)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": "manifest segment removed"
      },
      {
        "group": "Content Credentials (C2PA)",
        "name": "APP11 (JUMBF manifest)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": "manifest segment removed"
      }
    ]
  },
  {
    "id": "adobe-xmp-iptc-full",
    "file": "adobe-xmp-iptc-full.jpg",
    "format": "JPEG",
    "folded": true,
    "empty": false,
    "note": "Synthetic XMP, IPTC and EXIF segments on a generated image.",
    "bytes": 1528,
    "outputBytes": 804,
    "rows": [
      {
        "group": "XMP",
        "name": "APP1 (XMP)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      },
      {
        "group": "IPTC",
        "name": "APP13 (IPTC)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      },
      {
        "group": "EXIF / TIFF",
        "name": "APP1 (EXIF)",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      }
    ]
  },
  {
    "id": "webp-exif-chunk",
    "file": "webp-exif-chunk.webp",
    "format": "WebP",
    "folded": false,
    "empty": false,
    "note": "Synthetic EXIF and XMP chunks in a generated WebP file.",
    "bytes": 520,
    "outputBytes": 60,
    "rows": [
      {
        "group": "EXIF / TIFF",
        "name": "EXIF",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      },
      {
        "group": "XMP",
        "name": "XMP ",
        "before": 1,
        "after": 0,
        "status": "removed",
        "note": ""
      }
    ]
  },
  {
    "id": "no-tags-at-all",
    "file": "no-tags-at-all.jpg",
    "format": "JPEG",
    "folded": false,
    "empty": true,
    "note": "A generated image with no metadata segments to remove.",
    "bytes": 804,
    "outputBytes": 804,
    "rows": []
  },
  {
    "id": "already-cleaned",
    "file": "already-cleaned.png",
    "format": "PNG",
    "folded": false,
    "empty": true,
    "note": "The output of the same cleaning engine, read again.",
    "bytes": 261,
    "outputBytes": 261,
    "rows": []
  }
] as const;
