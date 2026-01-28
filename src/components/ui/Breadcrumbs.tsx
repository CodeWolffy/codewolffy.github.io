import React from 'react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    return (
        <nav className={`flex items-center text-lg text-muted-foreground ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center flex-wrap">
                <li>
                    <a href="/" className="hover:text-primary transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        首页
                    </a>
                </li>

                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                        {item.href ? (
                            <a href={item.href} className="hover:text-primary transition-colors">
                                {item.label}
                            </a>
                        ) : (
                            <span className="font-medium text-foreground" aria-current="page">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
