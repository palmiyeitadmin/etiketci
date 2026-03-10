"use client";

import React, { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';

interface BarcodeRendererProps {
    type: 'barcode' | 'qr';
    barcodeType?: string;
    content: string;
    widthPx: number;
    heightPx: number;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
    type,
    barcodeType,
    content,
    widthPx,
    heightPx
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !content) return;

        try {
            // Map our internal types to bwip-js bcid codes
            const bcid = type === 'qr' ? 'qrcode' : (barcodeType || 'code128');

            bwipjs.toCanvas(canvasRef.current, {
                bcid: bcid,
                text: content,
                scale: 2,
                height: 15,
                includetext: type === 'barcode',
                textxalign: 'center',
                textsize: 8,
            });
        } catch (err) {
            // Silently fail rendering if content is invalid for the type
            console.warn('Barcode rendering failed', err);
        }
    }, [type, barcodeType, content, widthPx, heightPx]);

    return (
        <div className="w-full h-full flex items-center justify-center p-1 bg-white overflow-hidden">
            <canvas
                ref={canvasRef}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto'
                }}
            />
        </div>
    );
};
