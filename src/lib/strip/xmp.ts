const XMP_PACKET = 'http://ns.adobe.com/xap/1.0/';

export interface XmpFields {
  digitalSourceType?: string;
  creator?: string;
  history?: string;
}

function attr(xml: string, name: string): string | undefined {
  const match = xml.match(new RegExp(`${name.replace(':', '\\:')}\\s*=\\s*"([^"]*)"`))
    ?? xml.match(new RegExp(`${name.replace(':', '\\:')}\\s*=\\s*'([^']*)'`));
  return match?.[1];
}

export function readXmpFields(bytes: Uint8Array): XmpFields {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const start = text.indexOf(XMP_PACKET);
  const xml = start >= 0 ? text.slice(start + XMP_PACKET.length) : text;
  const description = xml.match(/<rdf:Description\b[^>]*>/)?.[0] ?? xml;
  return {
    digitalSourceType: attr(description, 'digitalSourceType')
      ?? xml.match(/<iptcExt:DigitalSourceType[^>]*>([^<]*)</)?.[1],
    creator: attr(description, 'dc:creator')
      ?? xml.match(/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]*)</)?.[1],
    history: xml.match(/<xmpMM:History[^>]*>/)?.[0],
  };
}
