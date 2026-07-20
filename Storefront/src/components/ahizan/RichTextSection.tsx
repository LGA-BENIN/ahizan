import React from 'react';

export function RichTextSection({ config, wrapper }: { config: any, wrapper: string }) {
    if (!config.htmlContent) return null;

    return (
        <section 
            className="w-full mt-8 md:mt-10" 
            style={{ 
                backgroundColor: config.bgColor || 'transparent',
                padding: config.padding || '2rem 1rem'
            }}
        >
            <div 
                className={`${wrapper} mx-auto`}
                style={{
                    maxWidth: config.maxWidth || '800px',
                    color: config.textColor || 'inherit'
                }}
            >
                <div 
                    className="prose prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: config.htmlContent }}
                />
            </div>
        </section>
    );
}
