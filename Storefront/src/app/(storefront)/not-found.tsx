import { Button } from '@/components/ui/button';
import Link from "next/link";
import { Search, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="relative min-h-[75vh] flex items-center justify-center px-4 overflow-hidden bg-background">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative text-center space-y-8 max-w-lg z-10">
                {/* Custom CSS for Keyframe Animations */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes float {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-15px) rotate(2deg); }
                    }
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.05); }
                    }
                    @keyframes orbit {
                        from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
                        to { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
                    }
                    .animate-float {
                        animation: float 6s ease-in-out infinite;
                    }
                    .animate-pulse-slow {
                        animation: pulse-slow 4s ease-in-out infinite;
                    }
                    .animate-orbit {
                        animation: orbit 12s linear infinite;
                    }
                `}} />

                {/* Animated 404 SVG Illustration */}
                <div className="relative w-72 h-72 mx-auto flex items-center justify-center animate-float">
                    {/* Glowing ring */}
                    <div className="absolute inset-4 rounded-full border border-dashed border-primary/20 animate-spin" style={{ animationDuration: '30s' }} />
                    <div className="absolute w-2 h-2 bg-accent rounded-full animate-orbit" />
                    
                    {/* SVG graphic */}
                    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                        <defs>
                            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
                            </linearGradient>
                            <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        
                        {/* Background Radial Glow */}
                        <circle cx="100" cy="100" r="80" fill="url(#radialGlow)" />
                        
                        {/* Floating elements */}
                        {/* Stylized "404" with glowing gradient */}
                        <text 
                            x="50%" 
                            y="115" 
                            textAnchor="middle" 
                            fill="url(#glowGrad)" 
                            className="font-sans font-black text-6xl tracking-tighter"
                            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))' }}
                        >
                            404
                        </text>
                        
                        {/* Stylized search glass or planet element */}
                        <circle cx="140" cy="65" r="8" fill="var(--accent)" className="animate-pulse-slow" />
                        <circle cx="60" cy="140" r="5" fill="var(--primary)" opacity="0.6" />
                        <circle cx="150" cy="130" r="3" fill="var(--accent)" opacity="0.4" />
                        
                        {/* Orbiting Satellite dashed line */}
                        <path 
                            d="M 40,100 A 60,35 25 0,0 160,100" 
                            fill="none" 
                            stroke="var(--muted-foreground)" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                            opacity="0.3"
                        />
                    </svg>
                </div>

                <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-serif font-black text-foreground tracking-tight">
                        Oups ! Page introuvable
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto font-medium">
                        La page que vous recherchez n'existe pas, a été déplacée ou est temporairement indisponible.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
                    <Button asChild size="lg" className="rounded-xl font-bold uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/95 text-white shadow-md active:scale-95 transition-all flex items-center gap-2 px-6 h-12 cursor-pointer">
                        <Link href="/">
                            <Home className="w-4 h-4" />
                            Retour à l'accueil
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-border hover:bg-muted text-foreground hover:text-foreground transition-all active:scale-95 flex items-center gap-2 px-6 h-12">
                        <Link href="/search">
                            <Search className="w-4 h-4 text-primary" />
                            Rechercher un produit
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
