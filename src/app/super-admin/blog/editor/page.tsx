
"use client"

import React, { useRef, useState, useEffect, Suspense } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Image as ImageIcon, Link as LinkIcon, 
  Undo, Redo, Heading1, Heading2, Heading3, 
  Quote, RemoveFormatting, Eye, FileCode2, Save,
  ChevronLeft,
  Loader2,
  Trash2,
  Layout,
  Tag as TagIcon,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { BlogPost } from '@/lib/types';

export default function BlogEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Iniciando editor...</div>}>
      <BlogEditorContent />
    </Suspense>
  );
}

function BlogEditorContent() {
  const editorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const postId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [tags, setTags] = useState('');
  const [published, setPublished] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [viewMode, setViewMode] = useState<'visual' | 'html'>('visual');
  const [isSaving, setIsCreating] = useState(false);

  const postRef = useMemoFirebase(() => {
    if (!db || !postId) return null;
    return doc(db, 'blogPosts', postId);
  }, [db, postId]);

  const { data: post, isLoading } = useDoc<BlogPost>(postRef);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featuredImage || '');
      setTags(post.tags?.join(', ') || '');
      setPublished(post.published);
      setHtmlContent(post.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = post.content;
      }
    }
  }, [post]);

  const handleInput = () => {
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | null = null) => {
    if (viewMode !== 'visual' || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value as any);
    handleInput();
  };

  const addLink = () => {
    const url = prompt('Introduce la URL del enlace (ej: https://google.com):');
    if (url) execCommand('createLink', url);
  };

  const addImage = () => {
    const url = prompt('Introduce la URL de la imagen:');
    if (url) execCommand('insertImage', url);
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', tag);
  };

  const handleSave = async () => {
    if (!db || !user) return;
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Falta el título" });
      return;
    }

    setIsCreating(true);
    const slug = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    
    const postData = {
      title,
      slug,
      excerpt,
      featuredImage,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      published,
      content: htmlContent,
      author: user.displayName || user.email || 'Admin',
      updatedAt: serverTimestamp(),
    };

    try {
      if (postId) {
        await updateDoc(doc(db, 'blogPosts', postId), postData);
        toast({ title: "Artículo actualizado" });
      } else {
        const newPostRef = doc(collection(db, 'blogPosts'));
        await setDoc(newPostRef, {
          ...postData,
          id: newPostRef.id,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Artículo publicado" });
      }
      router.push('/super-admin/blog');
    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setIsCreating(false);
    }
  };

  const ToolbarButton = ({ icon: Icon, onClick, title, disabled = false }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-slate-800 transition-colors ${disabled ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
    >
      <Icon size={16} />
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-slate-800 mx-1"></div>;

  if (postId && isLoading) return <div className="p-8 text-center text-white">Cargando artículo...</div>;

  return (
    <SuperAdminLayout>
      <div className="flex flex-col h-[calc(100vh-12rem)] space-y-6">
        
        {/* Cabecera de Acción */}
        <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Volver al listado
          </Button>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Publicado en Web</Label>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <Button className="bg-red-600 hover:bg-red-700 px-8 font-black gap-2 shadow-lg shadow-red-900/40 h-11" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {postId ? 'GUARDAR CAMBIOS' : 'PUBLICAR ARTÍCULO'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
          
          {/* Editor Area */}
          <div className="lg:col-span-3 flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Barra de herramientas */}
            <div className="bg-slate-900/80 border-b border-slate-800 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10 backdrop-blur-sm">
              <ToolbarButton icon={Undo} onClick={() => execCommand('undo')} title="Deshacer" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Redo} onClick={() => execCommand('redo')} title="Rehacer" disabled={viewMode === 'html'} />
              <Divider />
              <ToolbarButton icon={Heading1} onClick={() => formatBlock('H1')} title="H1" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Heading2} onClick={() => formatBlock('H2')} title="H2" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Heading3} onClick={() => formatBlock('H3')} title="H3" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Quote} onClick={() => formatBlock('BLOCKQUOTE')} title="Cita" disabled={viewMode === 'html'} />
              <Divider />
              <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Negrita" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Cursiva" disabled={viewMode === 'html'} />
              <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="Subrayado" disabled={viewMode === 'html'} />
              <Divider />
              <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="Izquierda" disabled={viewMode === 'html'} />
              <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="Centro" disabled={viewMode === 'html'} />
              <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Lista" disabled={viewMode === 'html'} />
              <Divider />
              <ToolbarButton icon={LinkIcon} onClick={addLink} title="Enlace" disabled={viewMode === 'html'} />
              <ToolbarButton icon={ImageIcon} onClick={addImage} title="Imagen" disabled={viewMode === 'html'} />
              <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="Limpiar" disabled={viewMode === 'html'} />
              
              <div className="flex-grow"></div>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors ${viewMode === 'visual' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Eye size={12} /> VISUAL
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors ${viewMode === 'html' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <FileCode2 size={12} /> HTML
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              <style>{`
                .editor-content { color: #e2e8f0; font-family: 'Inter', sans-serif; }
                .editor-content:focus { outline: none; }
                .editor-content h1 { font-size: 2.5rem; font-weight: 800; margin: 2rem 0 1.5rem; color: #f8fafc; }
                .editor-content h2 { font-size: 2rem; font-weight: 700; margin: 1.5rem 0 1rem; color: #f8fafc; }
                .editor-content p { margin-bottom: 1.25rem; line-height: 1.8; opacity: 0.9; }
                .editor-content blockquote { border-left: 4px solid #ef4444; padding: 1.5rem; background: #0f172a; border-radius: 0 1rem 1rem 0; font-style: italic; margin: 2rem 0; }
                .editor-content img { border-radius: 1rem; max-width: 100%; height: auto; display: block; margin: 2.5rem auto; }
                .editor-content a { color: #ef4444; text-decoration: underline; }
                .editor-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
              `}</style>
              
              {viewMode === 'visual' ? (
                <div
                  ref={editorRef}
                  className="editor-content w-full h-full p-10 min-h-[500px]"
                  contentEditable={true}
                  onInput={handleInput}
                  onBlur={handleInput}
                  suppressContentEditableWarning={true}
                  placeholder="Escribe el contenido del artículo aquí..."
                />
              ) : (
                <textarea
                  className="w-full h-full p-10 font-mono text-sm text-blue-400 bg-slate-950 border-none outline-none resize-none focus:ring-0"
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                    if (editorRef.current) editorRef.current.innerHTML = e.target.value;
                  }}
                />
              )}
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6 overflow-y-auto pr-2">
            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-6">
              <h3 className="text-xs font-black uppercase text-red-500 tracking-[0.2em] flex items-center gap-2">
                <Layout className="w-4 h-4" /> Configuración Post
              </h3>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Título del Post</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="Ej: Nueva Normativa RD 3/2023" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Imagen Destacada (URL)</Label>
                <Input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="https://..." />
                {featuredImage && <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border border-slate-800"><img src={featuredImage} className="object-cover w-full h-full" alt="" /></div>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Resumen Corto (Excerpt)</Label>
                <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} className="bg-slate-950 border-slate-800 text-xs" rows={4} placeholder="Breve descripción para la cuadrícula..." />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><TagIcon className="w-3 h-3" /> Etiquetas (comas)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="normativa, piscinas, tech" />
              </div>
            </div>

            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                <Globe className="w-4 h-4" /> Estado SEO
              </h3>
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[10px] font-bold text-slate-500">VISTA PREVIA URL:</p>
                <code className="text-[9px] text-blue-400 block truncate">/blog/{title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
