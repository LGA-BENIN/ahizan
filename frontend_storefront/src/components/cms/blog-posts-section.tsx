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
                {displayPosts.map((post, idx) => {
                    const href = post.link || (post.slug ? `/product/${post.slug}` : undefined);
                    const Content = (
                        <article key={post.id || idx} className="group cursor-pointer relative bg-white rounded-[2rem] p-4 h-full border border-transparent hover:border-primary/20 transition-all">
                            <div className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden mb-6 shadow-md">
                                <img
                                    src={post.imageUrl || '/placeholder.png'}
                                    alt={post.title}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-primary shadow-lg z-20">
                                    {post.date}
                                </div>
                            </div>
                            <h3 className="text-lg font-black mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                {post.title}
                            </h3>
                            <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed font-medium opacity-80">
                                {post.excerpt}
                            </p>
                        </article>
                    );

                    if (href) {
                        return (
                            <Link key={post.id || idx} href={href} className="block no-underline">
                                {Content}
                            </Link>
                        );
                    }

                    return (
                        <div key={post.id || idx} className="opacity-50 grayscale cursor-not-allowed">
                            {Content}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
