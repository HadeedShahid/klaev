// schema.org data for search engines (lib/seo.ts). JSON.stringify output with "<" escaped cannot
// close the script element.
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }} />;
}
