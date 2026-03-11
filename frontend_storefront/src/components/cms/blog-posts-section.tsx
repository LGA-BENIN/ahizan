import React from 'react';
import Link from 'next/link';

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    date: string;
    imageUrl: string;
    slug: string;
    link?: string;
}

interface BlogPostsSectionProps {
    title?: string;
    description?: string;
    items?: BlogPost[];
    posts?: BlogPost[];
    count?: number;
    layout?: 'grid' | 'carousel';
}

export function BlogPostsSection({
    title = "Dernières Actualités",
    description = "Suivez nos dernières publications et conseils.",
    items,
    posts,
    count = 3,
    layout = 'grid'
}: BlogPostsSectionProps) {
    const displayPosts = (items && items.length > 0) ? items : (posts || []);

    return (
        <section className="py-12 container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div className="max-w-2xl text-left">
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-4 italic uppercase leading-none">{title}</h2>
                    {description && <p className="text-muted-foreground font-medium text-base">{description}</p>}
                    <div className="h-1.5 w-24 bg-primary mt-6 rounded-full" />
                </div>
                <Link href="/blog" className="text-sm font-black uppercase tracking-widest text-primary hover:translate-x-2 transition-transform h-fit pb-1 border-b-2 border-primary/20">
                    Toutes les publications →
                </Link>
            </div>

            <div className={`grid gap-10 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {displayPosts.map((post, idx) => (
                    <article key={post.id || idx} className="group cursor-pointer">
                        <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6 shadow-lg border border-muted">
                            <img
                                src={post.imageUrl}
                                alt={post.title}
                                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-xl">
                                {post.date}
                            </div>
                        </div>
                        <h3 className="text-xl font-black mb-3 group-hover:text-primary transition-colors leading-tight">
                            {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed font-medium">
                            {post.excerpt}
                        </p>
                        <Link href={post.link || `/blog/${post.slug}`} className="absolute inset-0 z-10" />
                    </article>
                ))}
            </div>
        </section>
    );
}
