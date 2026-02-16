import { notFound } from 'next/navigation';
import { getPage } from '@/lib/cms';
import { sectionRegistry } from '@/components/sections/section-registry';

interface PageProps {
    params: Promise<{
        slug: string[];
    }>;
}

export default async function DynamicCMSPage({ params }: PageProps) {
    const { slug } = await params;
    const slugString = slug.join('/');

    const page = await getPage(slugString);

    if (!page) {
        notFound();
    }

    return (
        <div className="min-h-screen">
            {page.sections
                .filter(s => s.isActive)
                .sort((a, b) => a.order - b.order)
                .map(section => {
                    const SectionComponent = sectionRegistry[section.type];
                    if (!SectionComponent) {
                        console.warn(`Unknown section type: ${section.type}`);
                        return null;
                    }

                    let data = {};
                    try {
                        data = section.dataJson ? JSON.parse(section.dataJson) : {};
                    } catch (e) {
                        console.error(`Failed to parse JSON for section ${section.id}`, e);
                    }

                    return <SectionComponent key={section.id} {...data} />;
                })}
        </div>
    );
}
