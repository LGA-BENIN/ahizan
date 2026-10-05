import CustomCmsPage, { generateMetadata as cmsGenerateMetadata } from "../[slug]/page";

export async function generateMetadata({ params }: any) {
    const { catchAll } = await params;
    const slug = Array.isArray(catchAll) ? catchAll[catchAll.length - 1] : catchAll;
    return cmsGenerateMetadata({ params: Promise.resolve({ slug }) });
}

export default async function CatchAllPage({ params }: any) {
    const { catchAll } = await params;
    const slug = Array.isArray(catchAll) ? catchAll[catchAll.length - 1] : catchAll;
    return <CustomCmsPage params={Promise.resolve({ slug })} />;
}
