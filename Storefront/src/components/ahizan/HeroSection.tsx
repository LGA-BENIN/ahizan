"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Smartphone,
    Headset,
    Phone,
    Store,
    ChevronLeft,
    ChevronRight,
    ChevronDown
} from "lucide-react";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

interface HeroSectionProps {
    heroConfig: any;
    promoConfig: any;
    siteCategories: any[];
}

export function HeroSection({ heroConfig, promoConfig, siteCategories }: HeroSectionProps) {
    const template = heroConfig?.selectedTemplate || 'classic';
    const config = heroConfig?.[template] || {};
    const [hoveredCat, setHoveredCat] = useState<any>(null);
    const { setPromoConfig } = useMobileMenu();

    const hClass = "h-[200px] sm:h-[260px] md:h-[340px]";

    // Share promoConfig with mobile sidebar via context
    useEffect(() => {
        if (promoConfig) {
            setPromoConfig(promoConfig);
        }
    }, [promoConfig, setPromoConfig]);

    return (
        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 relative">
            {/* Left Sidebar - Categories (Desktop only, mobile is in MobileCategorySidebar) */}
            {heroConfig.showSidebar && (
                <aside 
                    className={`hidden lg:flex w-60 border border-border/60 rounded-2xl bg-white shadow-sm relative z-50 ${hClass}`}
                    onMouseLeave={() => setHoveredCat(null)}
                >
                    <div className="flex flex-col w-full h-full relative">
                        <div className="px-5 py-3 border-b border-border/40 bg-muted/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">Catégories</span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 py-2">
                            {(() => {
                                // STRICT: Only show categories explicitly enabled in CATEGORIES section
                                const enabledCats = promoConfig?.enabledCategories || {};
                                const enabledSlugs = Object.entries(enabledCats).filter(([, v]) => v === true).map(([k]) => k);
                                let cats = siteCategories;
                                if (enabledSlugs.length > 0) {
                                    cats = siteCategories.filter((cat: any) => enabledSlugs.includes(cat.slug) || enabledSlugs.includes(cat.id));
                                    if (cats.length === 0) cats = siteCategories;
                                }
                                return cats;
                            })().map((cat: any, i: number) => (
                                <div 
                                    key={cat.id || i} 
                                    className="group/cat relative"
                                    onMouseEnter={() => setHoveredCat(cat)}
                                >
                                    <Link
                                        href={cat.id ? `/collection/${cat.slug}` : '#'}
                                        className={`flex items-center gap-3 px-5 py-2.5 text-[13px] text-foreground/80 hover:text-primary hover:bg-muted/30 transition-all ${!cat.id ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center text-foreground group-hover/cat:text-primary transition-colors">
                                            {cat.id && promoConfig?.heroIcons?.[cat.slug] ? (
                                                <img src={getAssetUrl(promoConfig.heroIcons[cat.slug])} className="w-full h-full object-cover rounded-sm" alt="" />
                                            ) : cat.id && promoConfig?.collectionMedia?.[cat.slug] ? (
                                                <img src={getAssetUrl(promoConfig.collectionMedia[cat.slug])} className="w-full h-full object-cover rounded-sm" alt="" />
                                            ) : (
                                                cat.id ? (cat.icon || <Smartphone className="w-3.5 h-3.5" />) : <div className="w-3.5 h-3.5 bg-muted animate-pulse rounded-full" />
                                            )}
                                        </div>
                                        <span className={`truncate font-semibold tracking-tight flex-1 ${!cat.id ? 'bg-muted animate-pulse text-transparent rounded w-20 h-3' : ''}`}>
                                            {cat.name || '...'}
                                        </span>
                                        {cat.children?.length > 0 && (
                                            <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-hover/cat:translate-x-1" />
                                        )}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Mega-menu style subcategory flyout rendered outside the overflow container */}
                    {hoveredCat && hoveredCat.children?.length > 0 && (
                        <div className="absolute left-full top-0 ml-2 bg-white border border-border/60 rounded-xl shadow-xl py-4 px-5 min-w-[280px] max-w-[400px] max-h-[500px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 z-[100] flex flex-col animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="pb-3 border-b border-border/40 mb-3">
                                <span className="font-bold text-[14px] text-foreground">{hoveredCat.name}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                                {hoveredCat.children.map((sub: any) => (
                                    <Link
                                        key={sub.id}
                                        href={`/collection/${sub.slug}`}
                                        className="group/sub flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/30"
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {sub.icon ? (
                                                <span className="text-foreground/70 group-hover/sub:text-primary transition-colors">{sub.icon}</span>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover/sub:bg-primary transition-colors" />
                                            )}
                                        </div>
                                        <span className="text-[13px] text-foreground/80 group-hover/sub:text-primary font-medium leading-snug break-words">
                                            {sub.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            )}

            {/* DYNAMIC CONTENT AREA */}
            <div className="flex-grow">
                {template === 'classic' && <ClassicHero baseConfig={config} globalConfig={heroConfig} hClass={hClass} />}
                {template === 'bento' && <BentoHero baseConfig={config} globalConfig={heroConfig} hClass={hClass} />}
                {template === 'fullwidth' && <FullWidthHero baseConfig={config} globalConfig={heroConfig} hClass={hClass} />}
            </div>
        </div>
    );
}

function CarouselWrapper({ slides, options, renderSlide }: { slides: any[], options: any, renderSlide: (slide: any) => React.ReactNode }) {
    const [current, setCurrent] = useState(0);
    const autoplay = options.autoplay !== false;
    const speed = options.autoplaySpeed || 5000;
    const effect = options.transitionEffect || 'fade';
    const showArrows = options.showArrows !== false;
    const showDots = options.showDots !== false;
    const arrowStyle = options.arrowStyle || 'circle';

    const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
    const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

    useEffect(() => {
        if (!autoplay || slides.length <= 1) return;
        const interval = setInterval(next, speed);
        return () => clearInterval(interval);
    }, [autoplay, speed, next, slides.length]);

    if (!slides || slides.length === 0) return null;

    return (
        <div className="relative w-full h-full overflow-hidden group">
            {slides.map((slide, index) => {
                const isActive = index === current;
                const isNext = index === (current + 1) % slides.length;
                const isPrev = index === (current - 1 + slides.length) % slides.length;

                let effectClasses = "opacity-0 invisible z-0";
                
                if (isActive) {
                    effectClasses = "opacity-100 visible z-10 scale-100 translate-x-0 rotate-y-0";
                } else if (effect === 'slide') {
                    effectClasses = `opacity-100 ${isPrev ? '-translate-x-full' : 'translate-x-[100%]'} z-0`;
                } else if (effect === 'zoom') {
                    effectClasses = "opacity-0 scale-110 z-0";
                } else if (effect === 'flip') {
                    effectClasses = "opacity-0 rotate-y-90 z-0";
                }

                return (
                    <div 
                        key={index} 
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out origin-center perspective-1000 ${effectClasses}`}
                        style={{ perspective: '1000px' }}
                    >
                        {renderSlide(slide)}
                    </div>
                );
            })}

            {slides.length > 1 && showArrows && (
                <>
                    <button 
                        onClick={(e) => { e.preventDefault(); prev(); }}
                        className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 opacity-100 md:opacity-0 group-hover:opacity-100 shadow-xl flex items-center justify-center text-white/90 hover:text-white bg-black/20 hover:bg-black/50 backdrop-blur-md ${arrowStyle === 'circle' ? 'rounded-full w-8 h-8 md:w-10 md:h-10' : arrowStyle === 'square' ? 'rounded-md w-8 h-8 md:w-10 md:h-10 border border-white/10' : 'w-7 h-7 md:w-8 md:h-8 !bg-transparent !shadow-none'}`}
                    >
                        <ChevronLeft className={`${arrowStyle === 'minimal' ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); next(); }}
                        className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 opacity-100 md:opacity-0 group-hover:opacity-100 shadow-xl flex items-center justify-center text-white/90 hover:text-white bg-black/20 hover:bg-black/50 backdrop-blur-md ${arrowStyle === 'circle' ? 'rounded-full w-8 h-8 md:w-10 md:h-10' : arrowStyle === 'square' ? 'rounded-md w-8 h-8 md:w-10 md:h-10 border border-white/10' : 'w-7 h-7 md:w-8 md:h-8 !bg-transparent !shadow-none'}`}
                    >
                        <ChevronRight className={`${arrowStyle === 'minimal' ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                    </button>
                </>
            )}

            {slides.length > 1 && showDots && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                    {slides.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            className={`transition-all duration-300 ${idx === current ? 'bg-white opacity-100 scale-110 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/40 opacity-60 hover:opacity-100'} ${options.dotStyle === 'line' ? 'w-6 h-1 rounded-sm' : 'w-2 h-2 rounded-full'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SlideContent({ slide, globalConfig, baseConfig, textColorClass }: any) {
    const title = slide.title || baseConfig.title;
    const subtitle = slide.subtitle || baseConfig.subtitle;
    const buttonText = slide.buttonText || baseConfig.buttonText;
    const buttonLink = slide.buttonLink || baseConfig.buttonLink;
    const type = slide.type || baseConfig.type;
    const bgUrl = slide.bgUrl || baseConfig.bgUrl;

    const overlayOpacity = globalConfig.overlayOpacity ?? 0.3;
    const overlayColor = globalConfig.overlayColor || '#000000';

    return (
        <div className="relative w-full h-full flex items-center">
            {bgUrl && (
                <>
                    {type === 'image' && (
                        <img src={getAssetUrl(bgUrl)} className="absolute inset-0 w-full h-full object-cover" alt={title} />
                    )}
                    {type === 'video' && (
                        <video src={getAssetUrl(bgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    )}
                </>
            )}
            {/* Custom Overlay Injection */}
            <div 
                className="absolute inset-0 z-10 pointer-events-none" 
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} 
            />

            <div className={`relative z-20 w-full p-6 sm:p-8 md:p-12 flex flex-col items-start text-left ${textColorClass}`}>
                <div className="animate-in slide-in-from-bottom-8 duration-700 w-full">
                    {title && (
                        <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black mb-2 sm:mb-3 md:mb-4 tracking-tight drop-shadow-lg leading-tight" style={{ 
                            fontSize: baseConfig.titleFontSize, 
                            fontWeight: baseConfig.titleFontWeight, 
                            color: baseConfig.titleColor || 'white'
                        }}>
                            {title}
                        </h1>
                    )}
                    {subtitle && (
                        <p className="max-w-full sm:max-w-md text-xs sm:text-sm md:text-base font-bold opacity-90 drop-shadow-md mb-4 sm:mb-6 md:mb-8 leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                    {buttonText && (
                        <Button size="lg" asChild className="rounded-full px-5 sm:px-8 md:px-10 py-2.5 sm:py-4 md:py-6 font-black text-xs sm:text-sm md:text-lg gap-2 shadow-2xl hover:scale-105 transition-transform border-none" style={{ backgroundColor: baseConfig.buttonBgColor || '#e31837', color: baseConfig.buttonTextColor || '#fff' }}>
                            <Link href={buttonLink || "/search"}>
                                {buttonText}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ClassicHero({ baseConfig, globalConfig, hClass }: { baseConfig: any, globalConfig: any, hClass: string }) {
    const slides = globalConfig.useCarousel && globalConfig.slides?.length > 0 ? globalConfig.slides : [baseConfig];

    return (
        <div className="flex flex-col xl:flex-row gap-4">
            {/* Main Banner */}
            <Card className={`flex-grow border-none shadow-sm relative ${hClass} overflow-hidden bg-muted/20 group`}>
                <CarouselWrapper 
                    slides={slides} 
                    options={globalConfig}
                    renderSlide={(slide) => <SlideContent slide={slide} baseConfig={baseConfig} globalConfig={globalConfig} textColorClass="text-white" />}
                />
            </Card>

            {/* Right Sidebar Promo */}
            {baseConfig.showServices !== false && (
                <div className="hidden lg:flex flex-col gap-3 w-60 flex-shrink-0">
                    <Card className={`p-4 flex flex-col justify-center gap-4 h-[162px] border-border/40 shadow-sm bg-white`}>
                        {[
                            { title: baseConfig.assistanceTitle || "Assistance", desc: baseConfig.assistanceDesc, icon: <Headset className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/5", link: baseConfig.assistanceLink || "#" },
                            { title: baseConfig.whatsappTitle || "WhatsApp", desc: baseConfig.whatsappDesc, icon: <Phone className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50", link: baseConfig.whatsappLink || "#" },
                            { title: baseConfig.sellTitle || "Vendre ici", desc: baseConfig.sellDesc, icon: <Store className="w-5 h-5" />, color: "text-secondary", bg: "bg-secondary/5", link: baseConfig.sellLink || "/register" }
                        ].map((box, i) => (
                            <Link key={i} href={box.link} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`p-2 ${box.bg} ${box.color} rounded-xl group-hover:scale-110 transition-transform shadow-sm`}>
                                    {box.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-foreground/80 uppercase tracking-tight group-hover:text-primary transition-colors">{box.title}</span>
                                    {box.desc && <span className="text-[10px] text-muted-foreground">{box.desc}</span>}
                                </div>
                            </Link>
                        ))}
                    </Card>

                    {baseConfig.showFlashCard !== false && (
                        <Card className={`h-[162px] rounded-2xl shadow-sm flex items-center justify-center p-6 relative overflow-hidden group border-none bg-secondary`} style={{ backgroundColor: baseConfig.flashBgColor }}>
                            {baseConfig.flashBgUrl && (
                                <>
                                    {baseConfig.flashBgType === 'image' && (
                                        <img src={getAssetUrl(baseConfig.flashBgUrl)} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-110" alt="" />
                                    )}
                                    {baseConfig.flashBgType === 'video' && (
                                        <video src={getAssetUrl(baseConfig.flashBgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                    )}
                                </>
                            )}
                            <div className="absolute inset-0 bg-black/20 z-10" />
                            <div className={`relative flex flex-col items-center text-center z-20 text-white`}>
                                <Badge className={`text-[10px] font-black tracking-widest uppercase border-white/40 bg-black/30 mb-2`}>{baseConfig.flashTitle || "Ventes Flash"}</Badge>
                                {baseConfig.flashDiscount && <span className="text-2xl font-black italic drop-shadow-lg">{baseConfig.flashDiscount}</span>}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

function BentoHero({ baseConfig, globalConfig, hClass }: { baseConfig: any, globalConfig: any, hClass: string }) {
    const slides = globalConfig.useCarousel && globalConfig.slides?.length > 0 ? globalConfig.slides : [baseConfig];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <Card className={`md:col-span-2 ${hClass} border-none shadow-sm overflow-hidden relative group bg-muted/20`}>
                <CarouselWrapper 
                    slides={slides} 
                    options={globalConfig}
                    renderSlide={(slide) => (
                        <div className="relative w-full h-full flex flex-col justify-end p-6 md:p-10 z-20">
                            {slide.bgUrl && (
                                <>
                                    <img src={getAssetUrl(slide.bgUrl)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                                </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                            <div className="relative z-20 text-white animate-in slide-in-from-bottom duration-700 w-full">
                                <h2 className="text-base sm:text-lg md:text-2xl lg:text-5xl font-black mb-2 sm:mb-3 md:mb-4 drop-shadow-md leading-tight">
                                    {slide.title || baseConfig.mainTitle}
                                </h2>
                                {(slide.subtitle || baseConfig.mainSubtitle) && (
                                    <p className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold mb-3 sm:mb-4 md:mb-6 lg:mb-8 opacity-90 max-w-full sm:max-w-sm md:max-w-lg drop-shadow-sm leading-relaxed">
                                        {slide.subtitle || baseConfig.mainSubtitle}
                                    </p>
                                )}
                                <Button asChild size="lg" className="w-fit bg-primary text-white hover:bg-primary/90 border-none rounded-xl font-black h-8 sm:h-10 md:h-12 px-4 sm:px-6 md:px-8 text-xs sm:text-sm md:text-base shadow-xl transition-all active:scale-95" style={{ backgroundColor: baseConfig.buttonBgColor || '#e31837', color: baseConfig.buttonTextColor || '#fff' }}>
                                    <Link href={slide.buttonLink || baseConfig.mainButtonLink || '#'}>
                                        {slide.buttonText || baseConfig.mainButtonText || "Découvrir"}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                />
            </Card>

            <div className="hidden md:flex flex-col gap-4 h-full">
                {baseConfig.showCard1 !== false && (
                    <Card className={`flex-grow border-none shadow-sm p-8 flex flex-col justify-center items-center relative overflow-hidden group text-white transition-all hover:scale-[1.02]`} style={{ backgroundColor: baseConfig.card1BgColor || '#f59e0b' }}>
                        {baseConfig.card1BgUrl && <img src={getAssetUrl(baseConfig.card1BgUrl)} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" alt="" />}
                        <div className="absolute inset-0 bg-black/20 z-10" />
                        <Link href={baseConfig.card1Link || '#'} className="relative z-20 text-center flex flex-col items-center">
                            {baseConfig.card1Discount && <Badge className="mb-2 bg-black/40 border-none text-[10px] font-black">{baseConfig.card1Discount}</Badge>}
                            <span className="text-[12px] font-black uppercase tracking-widest bg-black/30 px-3 py-1 rounded shadow-sm mb-1 block">{baseConfig.card1Title || "Promo 1"}</span>
                            {baseConfig.card1Subtitle && <span className="text-[10px] opacity-90 font-bold mb-3">{baseConfig.card1Subtitle}</span>}
                            {baseConfig.card1ButtonText && (
                                <div className="mt-2 text-[10px] font-black uppercase tracking-widest border-b border-white pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {baseConfig.card1ButtonText} →
                                </div>
                            )}
                        </Link>
                    </Card>
                )}
                
                {baseConfig.showCard2 !== false && (
                    <Card className={`flex-grow border-none shadow-sm p-8 flex flex-col justify-center items-center relative overflow-hidden group text-white transition-all hover:scale-[1.02]`} style={{ backgroundColor: baseConfig.card2BgColor || '#059669' }}>
                        {baseConfig.card2BgUrl && <img src={getAssetUrl(baseConfig.card2BgUrl)} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" alt="" />}
                        <div className="absolute inset-0 bg-black/20 z-10" />
                        <Link href={baseConfig.card2Link || '#'} className="relative z-20 text-center flex flex-col items-center">
                            {baseConfig.card2Discount && <Badge className="mb-2 bg-black/40 border-none text-[10px] font-black">{baseConfig.card2Discount}</Badge>}
                            <span className="text-[12px] font-black uppercase tracking-widest bg-black/30 px-3 py-1 rounded shadow-sm mb-1 block">{baseConfig.card2Title || "Promo 2"}</span>
                            {baseConfig.card2Subtitle && <span className="text-[10px] opacity-90 font-bold mb-3">{baseConfig.card2Subtitle}</span>}
                            {baseConfig.card2ButtonText && (
                                <div className="mt-2 text-[10px] font-black uppercase tracking-widest border-b border-white pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {baseConfig.card2ButtonText} →
                                </div>
                            )}
                        </Link>
                    </Card>
                )}
            </div>
        </div>
    );
}

function FullWidthHero({ baseConfig, globalConfig, hClass }: { baseConfig: any, globalConfig: any, hClass: string }) {
    const slides = globalConfig.useCarousel && globalConfig.slides?.length > 0 ? globalConfig.slides : [baseConfig];

    return (
        <Card className={`w-full relative ${hClass} border-none shadow-sm overflow-hidden flex items-center justify-center group bg-muted/20 animate-in zoom-in-95 duration-1000`}>
            <CarouselWrapper 
                slides={slides} 
                options={globalConfig}
                renderSlide={(slide) => (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {slide.bgUrl && (
                            <>
                                {slide.type === 'image' && <img src={getAssetUrl(slide.bgUrl)} className="absolute inset-0 w-full h-full object-cover" alt="" />}
                                {slide.type === 'video' && <video src={getAssetUrl(slide.bgUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-black/40 z-10 transition-opacity group-hover:opacity-30" />
                            </>
                        )}
                        <div className={`relative z-20 text-center p-4 sm:p-6 md:p-8 max-w-3xl text-white w-full`}>
                            {(slide.title || baseConfig.title) && (
                                <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-7xl font-black mb-2 sm:mb-3 md:mb-4 tracking-tighter drop-shadow-2xl uppercase transition-transform group-hover:scale-[1.01] duration-700 leading-tight">
                                    {slide.title || baseConfig.title}
                                </h2>
                            )}
                            {(slide.subtitle || baseConfig.subtitle) && (
                                <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold mb-3 sm:mb-4 md:mb-6 lg:mb-8 opacity-90 drop-shadow-md tracking-tight leading-relaxed max-w-full">
                                    {slide.subtitle || baseConfig.subtitle}
                                </p>
                            )}
                            {(slide.buttonText || baseConfig.buttonText) && (
                                <Button asChild size="lg" className="rounded-2xl bg-primary text-white hover:scale-105 transition-all shadow-2xl h-8 sm:h-10 md:h-12 lg:h-14 px-4 sm:px-6 md:px-8 lg:px-12 font-black text-xs sm:text-sm md:text-lg active:scale-95" style={{ backgroundColor: baseConfig.buttonBgColor || '#e31837', color: baseConfig.buttonTextColor || '#fff' }}>
                                    <Link href={slide.buttonLink || baseConfig.buttonLink || '#'}>
                                        {slide.buttonText || baseConfig.buttonText}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            />
        </Card>
    );
}
