'use client';

import {ProductCard} from "@/components/commerce/product-card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,} from "@/components/ui/carousel";
import {FragmentOf} from "@/graphql";
import {ProductCardFragment} from "@/lib/vendure/fragments";
import {useId} from "react";

interface ProductCarouselClientProps {
    title: string;
    products: Array<FragmentOf<typeof ProductCardFragment>>;
}

export function ProductCarousel({title, products}: ProductCarouselClientProps) {
    const id = useId();

    return (
        <section className="py-6 md:py-8 border-t border-border/40 mt-8">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 tracking-tight">{title}</h2>
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-2 md:-ml-3">
                        {products.map((product, i) => (
                            <CarouselItem key={id + i}
                                          className="pl-2 md:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                                <ProductCard product={product}/>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex"/>
                    <CarouselNext className="hidden md:flex"/>
                </Carousel>
            </div>
        </section>
    );
}
