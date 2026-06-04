import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SceneConfig {
  id: string;
  campaign_id: string;
  name: string;
  is_active: boolean;
  background_url: string | null;
  background_x: number;
  background_y: number;
  background_scale: number;
  background_opacity: number;
  grid_enabled: boolean;
  grid_size: number;
  grid_color: string;
  grid_opacity: number;
  grid_offset_x: number;
  grid_offset_y: number;
  snap_to_grid: boolean;
}

export interface MapToken {
  id: string;
  campaign_id: string;
  scene_id: string;
  character_id: string | null;
  token_type: 'player' | 'enemy' | 'npc';
  name: string | null;
  image_url: string | null;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  color?: string | null;
  x: number;
  y: number;
  size: number;
  is_visible: boolean;
}

export interface Drawing {
  id: string;
  campaign_id: string;
  scene_id: string;
  author_character_id: string | null;
  author_name?: string;
  author_color?: string;
  color: string;
  stroke_width: number;
  points: number[];
}

export const isVideoUrl = (url: string | null | undefined) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

export const useBattleMap = (campaignId: string) => {
  const [activeScene, setActiveScene] = useState<SceneConfig | null>(null);
  const [scenes, setScenes] = useState<SceneConfig[]>([]);
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  
  const [isLoading, setIsLoading] = useState(true);

  const activeSceneIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeSceneIdRef.current = activeScene?.id ?? null;
  }, [activeScene?.id]);

  const fetchActiveScene = useCallback(async () => {
    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active scene:', error);
      return;
    }

    if (data) {
      setActiveScene(data as unknown as SceneConfig);
    } else {
      setActiveScene(null);
    }
  }, [campaignId]);

  const fetchScenes = useCallback(async () => {
    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching scenes:', error);
      return;
    }

    setScenes(data as unknown as SceneConfig[]);
  }, [campaignId]);

  const fetchTokens = useCallback(async (sceneId: string) => {
    const { data, error } = await supabase
      .from('battle_map_tokens_simple')
      .select('*')
      .eq('scene_id', sceneId);

    if (error) {
      console.error('Error fetching tokens:', error);
      return;
    }

    setTokens(data as unknown as MapToken[]);
  }, []);

  const fetchDrawings = useCallback(async (sceneId: string) => {
    const { data, error } = await supabase
      .from('battle_map_drawings_simple')
      .select('*')
      .eq('scene_id', sceneId);

    if (error) {
      console.error('Error fetching drawings:', error);
      return;
    }

    const transformedDrawings = (data || []).map(d => ({
      ...d,
      points: d.points as number[]
    }));

    setDrawings(transformedDrawings as unknown as Drawing[]);
  }, []);

  const fetchFog = useCallback(async (sceneId: string) => {
    const { data, error } = await supabase
      .from('battle_map_fog_simple')
      .select('*')
      .eq('scene_id', sceneId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching fog:', error);
      return;
    }

    setFog((data || []) as unknown as FogElement[]);
  }, []);



  useEffect(() => {
    if (!campaignId) return;

    const loadData = async () => {
      setIsLoading(true);
      const { data: sceneData } = await supabase
        .from('battle_map_scenes_simple')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .maybeSingle();

      if (sceneData) {
        setActiveScene(sceneData as unknown as SceneConfig);
        await Promise.all([
          fetchScenes(),
          fetchTokens(sceneData.id),
          fetchDrawings(sceneData.id),
          fetchFog(sceneData.id)
        ]);
      } else {
        await fetchScenes();
      }
      setIsLoading(false);
    };


    loadData();

    const sceneSubscription = supabase
      .channel('battle_map_scenes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_scenes_simple',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newScene = payload.new as any;
            if (newScene.is_active && newScene.campaign_id === campaignId) {
              setActiveScene(prev => {
                if (prev && newScene.grid_size !== prev.grid_size) {
                  const ratio = newScene.grid_size / prev.grid_size;
                  setTokens(currentTokens => currentTokens.map(t => ({
                    ...t,
                    x: t.x * ratio,
                    y: t.y * ratio,
                    size: newScene.grid_size
                  })));
                }
                return newScene as unknown as SceneConfig;
              });
            }
          }
          fetchScenes();
        }
      )
      .subscribe();

    return () => {
      sceneSubscription.unsubscribe();
    };
  }, [campaignId, fetchActiveScene, fetchScenes]);

  useEffect(() => {
    if (!activeScene?.id) {
      setTokens([]);
      setDrawings([]);
      setFog([]);
      return;
    }

    fetchTokens(activeScene.id);
    fetchDrawings(activeScene.id);
    fetchFog(activeScene.id);


    const tokensSubscription = supabase
      .channel(`battle_map_tokens_${activeScene.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_tokens_simple',
          filter: `scene_id=eq.${activeScene.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newToken = payload.new as MapToken;
            if (newToken.scene_id !== activeSceneIdRef.current) return;
            setTokens(prev => {
              if (prev.some(t => t.id === newToken.id)) return prev;
              return [...prev, newToken];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedToken = payload.new as MapToken;
            setTokens(prev => prev.map(t => t.id === updatedToken.id ? updatedToken : t));
          } else if (payload.eventType === 'DELETE') {
            const oldToken = payload.old as { id: string };
            setTokens(prev => prev.filter(t => t.id !== oldToken.id));
          }
        }
      )
      .subscribe();

    const drawingsSubscription = supabase
      .channel(`battle_map_drawings_${activeScene.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_drawings_simple',
          filter: `scene_id=eq.${activeScene.id}`,
        },
        () => {
          if (activeSceneIdRef.current) fetchDrawings(activeSceneIdRef.current);
        }
      )
      .subscribe();

    const fogSubscription = supabase
      .channel(`battle_map_fog_${activeScene.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_fog_simple',
          filter: `scene_id=eq.${activeScene.id}`,
        },
        () => {
          if (activeSceneIdRef.current) fetchFog(activeSceneIdRef.current);
        }
      )
      .subscribe();


    return () => {
      tokensSubscription.unsubscribe();
      drawingsSubscription.unsubscribe();
      fogSubscription.unsubscribe();
    };
  }, [activeScene?.id, fetchTokens, fetchDrawings, fetchFog]);


  const updateScene = async (updates: Partial<SceneConfig>) => {
    if (!activeScene) return;
    const updatedScene = { ...activeScene, ...updates };
    setActiveScene(updatedScene);
    setScenes(prev => prev.map(s => s.id === activeScene.id ? updatedScene : s));
    
    await supabase.from('battle_map_scenes_simple').update(updates).eq('id', activeScene.id);
  };

  const createScene = async (name: string) => {
    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .insert([{
        campaign_id: campaignId,
        name,
        is_active: scenes.length === 0,
        background_scale: 1,
        background_opacity: 1,
        background_x: 0,
        background_y: 0,
        grid_enabled: true,
        grid_size: 70,
        grid_color: 'rgba(255,255,255,0.2)',
        grid_opacity: 0.5,
        snap_to_grid: true
      }])
      .select()
      .single();

    if (!error && data.is_active) setActiveScene(data as unknown as SceneConfig);
    fetchScenes();
  };

  const activateScene = async (sceneId: string) => {
    await supabase.from('battle_map_scenes_simple').update({ is_active: false }).eq('campaign_id', campaignId);
    const { data, error } = await supabase.from('battle_map_scenes_simple').update({ is_active: true }).eq('id', sceneId).select().single();
    if (!error) setActiveScene(data as unknown as SceneConfig);
  };

  const updateTokenPosition = async (tokenId: string, x: number, y: number, isFinal: boolean = true) => {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, x, y } : t));
    if (!isFinal) return;
    await supabase.from('battle_map_tokens_simple').update({ x, y }).eq('id', tokenId);
  };

  const updateTokenSize = async (tokenId: string, size: number) => {
    await supabase.from('battle_map_tokens_simple').update({ size }).eq('id', tokenId);
  };

  const addToken = async (token: Partial<MapToken>) => {
    if (!activeScene) return;
    const { data, error } = await supabase.from('battle_map_tokens_simple').insert([{
      ...token,
      campaign_id: campaignId,
      scene_id: activeScene.id,
      size: activeScene.grid_size,
      image_scale: token.image_scale || 1,
      image_offset_x: token.image_offset_x ?? 50,
      image_offset_y: token.image_offset_y ?? 50
    }]).select().single();
    if (!error && data) setTokens(prev => [...prev.filter(t => t.id !== data.id), data as unknown as MapToken]);
  };

  const removeToken = async (tokenId: string) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    await supabase.from('battle_map_tokens_simple').delete().eq('id', tokenId);
  };

  const addDrawing = async (drawing: Omit<Drawing, 'id' | 'campaign_id' | 'scene_id'>) => {
    if (!activeScene) return;
    const { data, error } = await supabase.from('battle_map_drawings_simple').insert([{
      ...drawing,
      campaign_id: campaignId,
      scene_id: activeScene.id,
      points: drawing.points as any
    }]).select().single();
    if (!error && data) fetchDrawings(activeScene.id);
  };

  const clearDrawings = async (options?: { authorId?: string, all?: boolean }) => {
    if (!activeScene) return;
    await supabase.from('battle_map_drawings_simple').delete().match({
      scene_id: activeScene.id,
      campaign_id: campaignId,
      ...(options?.authorId ? { author_character_id: options.authorId } : {})
    });
    fetchDrawings(activeScene.id);
  };

  const removeDrawing = async (drawingId: string) => {
    setDrawings(prev => prev.filter(d => d.id !== drawingId));
    await supabase.from('battle_map_drawings_simple').delete().eq('id', drawingId);
  };

  const undoLastDrawing = async (authorId: string) => {
    if (!activeScene) return;
    const authorDrawings = drawings.filter(d => d.author_character_id === authorId);
    if (authorDrawings.length > 0) await removeDrawing(authorDrawings[authorDrawings.length - 1].id);
  };

  const addFogElement = async (element: Omit<FogElement, 'id' | 'campaign_id' | 'scene_id' | 'created_at'>) => {
    if (!activeScene) return;
    
    const tempId = Math.random().toString(36).substring(7);
    const newElement: FogElement = {
      ...element,
      id: tempId,
      campaign_id: campaignId,
      scene_id: activeScene.id,
      created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setFog(prev => [...prev, newElement]);

    const { data, error } = await supabase.from('battle_map_fog_simple').insert([{
      ...element,
      campaign_id: campaignId,
      scene_id: activeScene.id,
      points: element.points as any
    }]).select().single();
    
    if (error) {
      toast.error('Error al guardar niebla');
      setFog(prev => prev.filter(f => f.id !== tempId));
    } else if (data) {
      // Replace temp with real data
      setFog(prev => prev.map(f => f.id === tempId ? (data as unknown as FogElement) : f));
    }
  };

  const removeFogElement = async (fogId: string) => {
    setFog(prev => prev.filter(f => f.id !== fogId));
    await supabase.from('battle_map_fog_simple').delete().eq('id', fogId);
  };

  const clearFog = async () => {
    if (!activeScene) return;
    await supabase.from('battle_map_fog_simple').delete().match({
      scene_id: activeScene.id,
      campaign_id: campaignId
    });
    fetchFog(activeScene.id);
  };

  const undoLastFog = async () => {
    if (!activeScene || fog.length === 0) return;
    const last = fog[fog.length - 1];
    await removeFogElement(last.id);
  };



  return {
    activeScene,
    scenes,
    tokens,
    drawings,
    fog,
    isLoading,
    updateScene,
    createScene,
    activateScene,
    updateTokenPosition,
    updateTokenSize,
    addToken,
    removeToken,
    addDrawing,
    clearDrawings,
    removeDrawing,
    undoLastDrawing,
    addFogElement,
    removeFogElement,
    clearFog,
    undoLastFog
  };
};

