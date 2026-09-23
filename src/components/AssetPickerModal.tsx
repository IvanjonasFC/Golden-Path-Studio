import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetReference } from '../lib/componentContract';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAsset?: AssetReference;
  onSelectAsset: (asset: AssetReference) => void;
}

const BRAND_PRESET_ASSETS: Array<{
  assetId: string;
  name: string;
  url: string;
  alt: string;
  aspectRatio: "4:5" | "1:1" | "16:9" | "3:2";
  category: "Retrato" | "Proyectos" | "Sistemas";
}> = [
  {
    assetId: "asset_portrait_ivan",
    name: "Retrato Iván Jonás (Principal)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    alt: "Retrato de Iván Jonás, Desarrollador Frontend y Diseñador de Sistemas",
    aspectRatio: "4:5",
    category: "Retrato",
  },
  {
    assetId: "asset_portrait_editorial",
    name: "Retrato Iván Jonás (Editorial B&N)",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    alt: "Retrato editorial de Iván Jonás en blanco y negro",
    aspectRatio: "4:5",
    category: "Retrato",
  },
  {
    assetId: "asset_cover_golden_studio",
    name: "Golden Path Studio Console",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
    alt: "Interfaz de código y consola IDE de Golden Path Studio",
    aspectRatio: "16:9",
    category: "Proyectos",
  },
  {
    assetId: "asset_cover_quantum",
    name: "Quantum UI Design System",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    alt: "Dashboard analítico del sistema Quantum UI",
    aspectRatio: "16:9",
    category: "Proyectos",
  },
  {
    assetId: "asset_cover_neural",
    name: "Neural Code Synthesizer",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    alt: "Visualización de flujo neuronal e inteligencia artificial",
    aspectRatio: "16:9",
    category: "Proyectos",
  }
];

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  onClose,
  currentAsset,
  onSelectAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'url' | 'upload'>('library');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(currentAsset?.assetId || BRAND_PRESET_ASSETS[0].assetId);
  const [customUrl, setCustomUrl] = useState<string>(currentAsset?.url || '');
  const [altText, setAltText] = useState<string>(currentAsset?.alt || 'Retrato de Iván Jonás');
  const [aspectRatio, setAspectRatio] = useState<"4:5" | "1:1" | "16:9" | "3:2">(
    (currentAsset?.aspectRatio as "4:5" | "1:1" | "16:9" | "3:2") || "4:5"
  );
  const [fit, setFit] = useState<"cover" | "contain" | "fill">(currentAsset?.fit || "cover");
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>(
    currentAsset?.focalPoint || { x: 50, y: 35 }
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const currentPreviewUrl = activeTab === 'url' ? customUrl 
    : (BRAND_PRESET_ASSETS.find(a => a.assetId === selectedAssetId)?.url || customUrl || BRAND_PRESET_ASSETS[0].url);

  const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setFocalPoint({ x, y });
  };

  const handleConfirm = () => {
    const chosenAsset: AssetReference = {
      assetId: activeTab === 'url' ? `custom_url_${Date.now()}` : selectedAssetId,
      url: currentPreviewUrl,
      alt: altText.trim() || 'Imagen de componente',
      aspectRatio,
      fit,
      focalPoint,
    };
    onSelectAsset(chosenAsset);
    onClose();
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#0e0e12',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f0a470', boxShadow: '0 0 8px rgba(240, 164, 112, 0.8)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f8fafc' }}>
              Asset Manager · Selección y Optimización de Imagen
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <button
            onClick={() => setActiveTab('library')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              border: activeTab === 'library' ? '1px solid #f0a470' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'library' ? 'rgba(240, 164, 112, 0.15)' : 'transparent',
              color: activeTab === 'library' ? '#f0a470' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            Biblioteca de Marca
          </button>

          <button
            onClick={() => setActiveTab('url')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              border: activeTab === 'url' ? '1px solid #f0a470' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'url' ? 'rgba(240, 164, 112, 0.15)' : 'transparent',
              color: activeTab === 'url' ? '#f0a470' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            URL Externa
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              border: activeTab === 'upload' ? '1px solid #f0a470' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'upload' ? 'rgba(240, 164, 112, 0.15)' : 'transparent',
              color: activeTab === 'upload' ? '#f0a470' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Subir Archivo Local
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.25fr) minmax(300px, 1fr)',
          gap: '24px',
          padding: '22px 24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
        }}>
          {/* Left Column: Asset Selection / Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            {activeTab === 'library' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assets Disponibles ({BRAND_PRESET_ASSETS.length})
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {BRAND_PRESET_ASSETS.map((asset) => {
                    const isSelected = selectedAssetId === asset.assetId;
                    return (
                      <div
                        key={asset.assetId}
                        onClick={() => {
                          setSelectedAssetId(asset.assetId);
                          setAltText(asset.alt);
                          setAspectRatio(asset.aspectRatio);
                        }}
                        style={{
                          border: isSelected ? '2px solid #f0a470' : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? 'rgba(240, 164, 112, 0.12)' : 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ height: '110px', width: '100%', overflow: 'hidden', background: '#050508' }}>
                          <img src={asset.url} alt={asset.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ padding: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {asset.name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{asset.category}</span>
                            <span style={{ fontFamily: 'monospace' }}>{asset.aspectRatio}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  URL de Imagen (HTTPS)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Ingrese una URL pública con certificado SSL válido.
                </span>
              </div>
            )}

            {activeTab === 'upload' && (
              <div style={{
                border: '2px dashed rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.01)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f0a470" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Arrastra o selecciona un archivo
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  PNG, JPG, WebP o AVIF hasta 10MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setCustomUrl(event.target.result as string);
                          setActiveTab('url');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                  id="asset-file-input"
                />
                <label
                  htmlFor="asset-file-input"
                  style={{
                    background: '#f0a470',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  Examinar Equipo
                </label>
              </div>
            )}

            {/* Accessibility Mandatory Alt Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Texto Alternativo (Alt Text - WCAG AAA)
                </label>
                <span style={{ fontSize: '10px', color: altText.trim().length > 5 ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                  {altText.trim().length > 5 ? 'Cumple accesibilidad' : 'Requerido'}
                </span>
              </div>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descripción concisa para lectores de pantalla..."
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: altText.trim().length > 0 ? '1px solid rgba(255,255,255,0.15)' : '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Right Column: Focal Point & Crop Configuration */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'rgba(255,255,255,0.02)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                Punto Focal (Click en imagen)
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f0a470' }}>
                X: {focalPoint.x}% · Y: {focalPoint.y}%
              </span>
            </div>

            {/* Interactive Focal Point Canvas */}
            <div
              onClick={handleFocalClick}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: aspectRatio === '4:5' ? '4/5' : aspectRatio === '1:1' ? '1/1' : '16/9',
                maxHeight: '220px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#050508',
                cursor: 'crosshair',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={currentPreviewUrl}
                alt="Preview Focal"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: fit,
                  objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                  pointerEvents: 'none',
                }}
              />
              {/* Target Marker */}
              <div
                style={{
                  position: 'absolute',
                  left: `${focalPoint.x}%`,
                  top: `${focalPoint.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #f0a470',
                  background: 'rgba(240, 164, 112, 0.4)',
                  boxShadow: '0 0 10px #f0a470',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Ratio & Fit selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Proporción (Aspect Ratio)
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as "4:5" | "1:1" | "16:9" | "3:2")}
                  style={{
                    width: '100%',
                    background: '#121216',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                >
                  <option value="4:5">4:5 (Retrato Editorial)</option>
                  <option value="1:1">1:1 (Avatar Cuadrado)</option>
                  <option value="16:9">16:9 (Panorámico / Cover)</option>
                  <option value="3:2">3:2 (Fotográfico)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Ajuste (Object Fit)
                </label>
                <select
                  value={fit}
                  onChange={(e) => setFit(e.target.value as "cover" | "contain")}
                  style={{
                    width: '100%',
                    background: '#121216',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                >
                  <option value="cover">Cover (Rellenar recortando)</option>
                  <option value="contain">Contain (Ajustar completo)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 20px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#f0a470',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Aplicar Asset
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
