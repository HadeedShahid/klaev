import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { restockSize } from "@/app/actions/admin";
import { addSizeAction, photoAction, saveProductAction, saveSizeAction, uploadProductPhoto } from "@/app/actions/admin-products";
import { ActionDialog } from "@/components/admin/action-dialog";
import { Field } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { PhotoMove } from "@/components/admin/photo-tools";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { SaveForm } from "@/components/admin/save-form";
import { SectionsEditor } from "@/components/admin/sections-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/format";
import { getProductForEdit, listCollections } from "@/lib/admin/products";
import { stockHistory } from "@/lib/admin/stock";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { STORE } from "@/lib/store";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

const FORM = "product-form";

export async function generateMetadata({ params }: PageProps<"/admin/products/[id]">): Promise<Metadata> {
  const product = await getProductForEdit(await getDb(), Number((await params).id));
  return { title: product?.title ?? "Product" };
}

function Labelled({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const REASONS: Record<string, string> = {
  restock: "Restocked",
  correction: "Count corrected",
  sale: "Sold",
  cancelled: "Order cancelled",
  refused: "Refused at the door",
};

// One product, laid out like Shopify's product page: what it is and how it's described, its
// photos, price, sizes and stock, and how search engines show it on the left; whether it's on the
// store and where it lives on the right. One Save covers every field; sizes and photos save as
// they're changed.
export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const db = await getDb();
  const id = Number((await params).id);
  const [product, collections] = await Promise.all([getProductForEdit(db, id), listCollections(db)]);
  if (!product) notFound();
  const history = await stockHistory(db, id);
  const field = (name: string) => `product-${id}-${name}`;
  const margin = (cost: number | null) => (cost === null ? null : Math.round(((product.price - cost) / product.price) * 100));

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/admin/products" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Products
            </Link>
            <span>{product.title}</span>
            {product.status !== "active" ? (
              <Badge variant="outline" className="text-muted-foreground">
                {product.status === "draft" ? "Draft" : "Archived"}
              </Badge>
            ) : null}
          </span>
        }
      >
        <SaveForm id={FORM} action={saveProductAction} hidden={{ productId: id }} />
      </PageHeader>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <Labelled id={field("title")} label="Title">
                <input id={field("title")} form={FORM} name="title" defaultValue={product.title} required className={adminField} />
              </Labelled>
              <Labelled id={field("tagline")} label="Tagline" hint="The short line under the title.">
                <input id={field("tagline")} form={FORM} name="tagline" defaultValue={product.tagline ?? ""} className={adminField} />
              </Labelled>
              <Labelled id={field("intro")} label="Description" hint="A blank line between paragraphs.">
                <textarea
                  id={field("intro")}
                  form={FORM}
                  name="intro"
                  rows={4}
                  defaultValue={product.intro.join("\n\n")}
                  className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
                />
              </Labelled>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>The sections under the description on the product page.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionsEditor form={FORM} sections={product.sections} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>The first is the one the store leads with. Phone photos are fine; they&apos;re resized here before upload.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {product.images.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {product.images.map((image, index) => (
                    <li key={image.id} className="flex flex-col gap-1.5">
                      <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-muted">
                        <Image src={image.src} width={image.width} height={image.height} alt={image.alt} sizes="200px" className="size-full object-cover" />
                        {index === 0 ? <span className="absolute top-2 left-2 rounded-md bg-background px-1.5 py-0.5 text-xs font-medium">First</span> : null}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <PhotoMove imageId={image.id} first={index === 0} last={index === product.images.length - 1} />
                        <span className="flex-1" />
                        <ActionDialog action={photoAction} label="Alt" title="Describe this photo" description="For people who can't see it, and for search engines." hidden={{ imageId: image.id, intent: "alt" }} submit="Save" variant="ghost">
                          <Field id={`photo-${image.id}-alt`} name="alt" label="Description" defaultValue={image.alt} required autoComplete="off" />
                        </ActionDialog>
                        <ActionDialog
                          action={photoAction}
                          label="Remove"
                          title="Remove this photo?"
                          description="It comes off the store and its copies are deleted."
                          hidden={{ imageId: image.id, intent: "delete" }}
                          submit="Remove it"
                          dismiss="Keep it"
                          variant="ghost"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No photos yet. A product needs at least one to go on the store.</p>
              )}
              <PhotoUploader upload={uploadProductPhoto.bind(null, id)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Labelled id={field("price")} label="Price, PKR">
                <input id={field("price")} form={FORM} name="price" inputMode="numeric" defaultValue={product.price} required className={cn(adminField, "tabular-nums")} />
              </Labelled>
              <Labelled id={field("compare")} label="Compare-at price, PKR" hint="The old price, shown crossed out while it's higher. Leave empty when not on sale.">
                <input
                  id={field("compare")}
                  form={FORM}
                  name="compareAtPrice"
                  inputMode="numeric"
                  defaultValue={product.compareAtPrice ?? ""}
                  className={cn(adminField, "tabular-nums")}
                />
              </Labelled>
            </CardContent>
          </Card>

          <Card className="pb-0">
            <CardHeader>
              <CardTitle>Sizes and stock</CardTitle>
              <CardDescription>Cost per item is what one piece cost you; profit and margin follow from the price.</CardDescription>
              <CardAction>
                <ActionDialog action={addSizeAction} label="Add size" title="Add a size" hidden={{ productId: id }} submit="Add size">
                  <div className="grid grid-cols-2 gap-3">
                    <Field id={`new-size-${id}`} name="size" label="Size" placeholder="XXL" required autoComplete="off" />
                    <Field id={`new-cost-${id}`} name="costPrice" label="Cost per item, PKR" inputMode="numeric" />
                  </div>
                  <Field id={`new-sku-${id}`} name="sku" label="SKU" hint="Leave empty to make one from the product's name." autoComplete="off" />
                </ActionDialog>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Size</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Profit</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => {
                    const name = variant.size ? `size ${variant.size}` : "this product";
                    return (
                      <TableRow key={variant.id} className="border-hairline">
                        <TableCell className="pl-4 font-medium">{variant.size ?? "One size"}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{variant.sku}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", variant.costPrice === null && "text-muted-foreground")}>
                          {variant.costPrice === null ? "Not set" : formatPKR(variant.costPrice)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {variant.costPrice === null ? "" : `${formatPKR(product.price - variant.costPrice)}, ${margin(variant.costPrice)}%`}
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", variant.stock === 0 ? "text-muted-foreground" : "font-medium")}>
                          {variant.stock === 0 ? "Sold out" : variant.stock}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <ActionDialog
                              action={restockSize}
                              label="Restock"
                              title={`Restock ${name}`}
                              description={`${variant.stock} available now. Enter how many came in; they're added to it.`}
                              hidden={{ variantId: variant.id }}
                              submit="Restock"
                            >
                              <Field id={`restock-${variant.id}-quantity`} name="quantity" label="How many came in" inputMode="numeric" required autoFocus />
                              <Field id={`restock-${variant.id}-note`} name="note" label="Note" placeholder="Optional" autoComplete="off" />
                            </ActionDialog>
                            <ActionDialog action={saveSizeAction} label="Edit" title={`Edit ${name}`} hidden={{ variantId: variant.id }} submit="Save" variant="ghost">
                              <div className="grid grid-cols-2 gap-3">
                                <Field id={`size-${variant.id}-size`} name="size" label="Size" defaultValue={variant.size ?? ""} required autoComplete="off" />
                                <Field id={`size-${variant.id}-cost`} name="costPrice" label="Cost per item, PKR" inputMode="numeric" defaultValue={variant.costPrice ?? ""} />
                              </div>
                              <Field id={`size-${variant.id}-sku`} name="sku" label="SKU" defaultValue={variant.sku} required autoComplete="off" />
                            </ActionDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
              <CardDescription>How Google shows this page. Empty fields use the title and tagline.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5 rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">
                  {STORE.siteUrl.replace("https://", "")} › products › {product.handle}
                </p>
                <p className="text-base font-medium">{product.seoTitle ?? `${product.title} | Klaev`}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{product.seoDescription ?? product.tagline ?? ""}</p>
              </div>
              <Labelled id={field("seo-title")} label="Page title" hint="Up to 70 characters.">
                <input id={field("seo-title")} form={FORM} name="seoTitle" maxLength={70} defaultValue={product.seoTitle ?? ""} className={adminField} />
              </Labelled>
              <Labelled id={field("seo-description")} label="Description" hint="Up to 320 characters; Google shows about 160.">
                <textarea
                  id={field("seo-description")}
                  form={FORM}
                  name="seoDescription"
                  maxLength={320}
                  rows={3}
                  defaultValue={product.seoDescription ?? ""}
                  className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
                />
              </Labelled>
            </CardContent>
          </Card>

          <Card id="history" className="pb-0">
            <CardHeader>
              <CardTitle>Stock history</CardTitle>
              <CardDescription>Every change to this product&apos;s stock, newest first.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {history.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">When</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>What</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="pr-4 text-right">Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id} className="border-hairline">
                        <TableCell className="pl-4 text-muted-foreground tabular-nums">{dateTime(entry.createdAt)}</TableCell>
                        <TableCell>{entry.size ?? "One size"}</TableCell>
                        <TableCell>
                          {REASONS[entry.reason]}
                          {entry.orderNumber ? (
                            <>
                              {", "}
                              <Link href={`/admin/orders/${entry.orderNumber}`} className="underline-offset-4 hover:underline">
                                #{entry.orderNumber}
                              </Link>
                            </>
                          ) : null}
                          {entry.note ? <span className="text-muted-foreground">, {entry.note}</span> : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.change > 0 ? "+" : ""}
                          {entry.change}
                        </TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">{entry.stockAfter}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <select id={field("status")} form={FORM} name="status" defaultValue={product.status} aria-label="Status" className={adminField}>
                <option value="active">Active, on the store</option>
                <option value="draft">Draft, hidden</option>
                <option value="archived">Archived, retired</option>
              </select>
              {product.status === "active" ? (
                <a href={`/products/${product.handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                  View on the store
                  <ExternalLink className="size-3.5" strokeWidth={1.8} aria-hidden />
                </a>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Labelled id={field("collection")} label="Collection">
                <select id={field("collection")} form={FORM} name="collectionHandle" defaultValue={product.collectionHandle} className={adminField}>
                  {collections.map((collection) => (
                    <option key={collection.handle} value={collection.handle}>
                      {collection.title}
                    </option>
                  ))}
                </select>
              </Labelled>
              <Labelled id={field("colour")} label="Colour" hint="Names the colour on the home page's picker and cards.">
                <input id={field("colour")} form={FORM} name="colour" defaultValue={product.colour ?? ""} className={adminField} />
              </Labelled>
              <Labelled id={field("tags")} label="Tags" hint="Separated by commas.">
                <input id={field("tags")} form={FORM} name="tags" defaultValue={product.tags.join(", ")} className={adminField} />
              </Labelled>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
