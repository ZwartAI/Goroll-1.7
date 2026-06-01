import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { debounce } from 'lodash';

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
  color: string;
  stroke_width: number;
  points: number[];
}

export const useBattleMap = (campaignId: string) => {
  const [activeScene, setActiveScene] = useState<SceneConfig | null>(null);
  const [scenes, setScenes] = useState<SceneConfig[]>([]);
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Transform points from Json to number[]
    const transformedDrawings = (data || []).map(d => ({
      ...d,
      points: d.points as number[]
    }));

    setDrawings(transformedDrawings as unknown as Drawing[]);
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    const loadData = async () => {
      setIsLoading(true);
      await fetchActiveScene();
      await fetchScenes();
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
              setActiveScene(newScene as unknown as SceneConfig);
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

  const activeSceneIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSceneIdRef.current = activeScene?.id ?? null;
  }, [activeScene?.id]);

  useEffect(() => {
    if (!activeScene?.id) {
      setTokens([]);
      setDrawings([]);
      return;
    }

    fetchTokens(activeScene.id);
    fetchDrawings(activeScene.id);

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
          console.info('BattleMap token realtime event:', {
            eventType: payload.eventType,
            sceneId: activeScene.id,
            activeSceneIdRef: activeSceneIdRef.current
          });

          if (payload.eventType === 'INSERT') {
            const newToken = payload.new as MapToken;
            if (newToken.scene_id !== activeSceneIdRef.current) return;

            setTokens(prev => {
              const exists = prev.some(t => t.id === newToken.id);
              if (exists) return prev;
              
              const withoutSameChar = prev.filter(t => 
                !(t.character_id && t.character_id === newToken.character_id && t.scene_id === newToken.scene_id)
              );
              return [...withoutSameChar, newToken];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedToken = payload.new as MapToken;
            if (updatedToken.scene_id !== activeSceneIdRef.current) {
              setTokens(prev => prev.filter(t => t.id !== updatedToken.id));
              return;
            }

            // If it's the active scene, check if it's visible
            // The Token component handles opacity for is_visible=false, 
            // but if we want to remove it entirely when hidden, we'd filter here.
            // As per user request: "visualmente no aparece o no desaparece"
            setTokens(prev => {
              const exists = prev.some(t => t.id === updatedToken.id);
              if (exists) {
                return prev.map(t => t.id === updatedToken.id ? updatedToken : t);
              } else if (updatedToken.is_visible !== false) {
                return [...prev, updatedToken];
              }
              return prev;
            });
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
          if (activeSceneIdRef.current) {
            fetchDrawings(activeSceneIdRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      tokensSubscription.unsubscribe();
      drawingsSubscription.unsubscribe();
    };
  }, [activeScene?.id, fetchTokens, fetchDrawings]);

  // Debounced DB update
  const debouncedUpdate = useRef(
    debounce(async (sceneId: string, updates: Partial<SceneConfig>) => {
      const { error } = await supabase
        .from('battle_map_scenes_simple')
        .update(updates)
        .eq('id', sceneId);

      if (error) {
        console.error('Error updating scene:', error);
        toast.error('No se pudo sincronizar el cambio con el servidor');
      }
    }, 500)
  ).current;
  
  const debouncedUpdateTokens = useRef(
    debounce(async (updatedTokens: MapToken[]) => {
      for (const token of updatedTokens) {
        const { error } = await supabase
          .from('battle_map_tokens_simple')
          .update({ x: token.x, y: token.y, size: token.size })
          .eq('id', token.id);
        if (error) console.error('Error updating token after grid resize:', error);
      }
    }, 500)
  ).current;

  const updateScene = async (updates: Partial<SceneConfig>) => {
    if (!activeScene) return;
    
    // Check if grid_size changed to scale tokens
    if (updates.grid_size && updates.grid_size !== activeScene.grid_size) {
      const ratio = updates.grid_size / activeScene.grid_size;
      const newGridSize = updates.grid_size;
      
      // Update all tokens positions and sizes locally
      const updatedTokens = tokens.map(t => ({
        ...t,
        x: t.x * ratio,
        y: t.y * ratio,
        size: newGridSize
      }));
      setTokens(updatedTokens);

      // Update tokens in DB
      // We do this individually or with a RPC if available, but for now individual updates
      // This ensures all players see the change
      for (const token of updatedTokens) {
        supabase
          .from('battle_map_tokens_simple')
          .update({ x: token.x, y: token.y, size: token.size })
          .eq('id', token.id)
          .then(({ error }) => {
            if (error) console.error('Error updating token after grid resize:', error);
          });
      }
    }

    // Optimistic local update
    const updatedScene = { ...activeScene, ...updates };
    setActiveScene(updatedScene);
    
    // Update in scenes list
    setScenes(prev => prev.map(s => s.id === activeScene.id ? updatedScene : s));

    // Call debounced DB update
    debouncedUpdate(activeScene.id, updates);
  };

  const createScene = async (name: string) => {
    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .insert([
        {
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
        },
      ])
      .select()
      .single();

    if (error) {
      toast.error('No se pudo crear la escena');
    } else if (data.is_active) {
      setActiveScene(data as unknown as SceneConfig);
    }
    fetchScenes();
  };

  const activateScene = async (sceneId: string) => {
    await supabase
      .from('battle_map_scenes_simple')
      .update({ is_active: false })
      .eq('campaign_id', campaignId);

    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .update({ is_active: true })
      .eq('id', sceneId)
      .select()
      .single();

    if (error) {
      toast.error('No se pudo activar la escena');
    } else {
      setActiveScene(data as unknown as SceneConfig);
    }
  };

  const updateTokenPosition = async (tokenId: string, x: number, y: number, isFinal: boolean = true) => {
    // Optimistic local update
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, x, y } : t));

    // Only update DB if it's the final position to avoid excessive writes
    // and let realtime handle the intermediate states for others if needed.
    // However, the user asked for realtime DM and players seeing changes.
    // We'll use a small debounce or only update on final for performance.
    if (!isFinal) return;

    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .update({ x, y })
      .eq('id', tokenId);

    if (error) {
      console.error('Error updating token position:', error);
      toast.error('Error al sincronizar posición');
      // Refetch to sync correctly
      if (activeScene) fetchTokens(activeScene.id);
    }
  };

  const updateTokenSize = async (tokenId: string, size: number) => {
    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .update({ size })
      .eq('id', tokenId);

    if (error) {
      console.error('Error updating token size:', error);
    }
  };

  const addToken = async (token: Partial<MapToken>) => {
    if (!activeScene) return;
    
    const newTokenData = { 
      ...token, 
      campaign_id: campaignId, 
      scene_id: activeScene.id,
      size: activeScene.grid_size, // Force size to match grid
      image_scale: token.image_scale || 1,
      image_offset_x: token.image_offset_x ?? 50,
      image_offset_y: token.image_offset_y ?? 50
    };

    const { data, error } = await supabase
      .from('battle_map_tokens_simple')
      .insert([newTokenData])
      .select()
      .single();

    if (error) {
      toast.error('No se pudo añadir el token');
    } else if (data) {
      const insertedToken = data as unknown as MapToken;
      setTokens(prev => {
        const withoutSame = prev.filter(t => 
          t.id !== insertedToken.id && 
          !(t.character_id && t.character_id === insertedToken.character_id && t.scene_id === insertedToken.scene_id)
        );
        return [...withoutSame, insertedToken];
      });
    }
  };

  const removeToken = async (tokenId: string) => {
    // Optimistic local update
    setTokens(prev => prev.filter(t => t.id !== tokenId));

    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .delete()
      .eq('id', tokenId);

    if (error) {
      toast.error('No se pudo retirar el token');
      // Refetch to sync correctly
      if (activeScene) fetchTokens(activeScene.id);
    }
  };

  const addDrawing = async (drawing: Omit<Drawing, 'id' | 'campaign_id' | 'scene_id'>) => {
    if (!activeScene) return;
    const { error } = await supabase
      .from('battle_map_drawings_simple')
      .insert([{ 
        ...drawing, 
        campaign_id: campaignId, 
        scene_id: activeScene.id,
        points: drawing.points as any // points is JSONB in DB
      }]);

    if (error) {
      console.error('Error adding drawing:', error);
    }
  };

  const clearDrawings = async () => {
    if (!activeScene) return;
    const { error } = await supabase
      .from('battle_map_drawings_simple')
      .delete()
      .eq('scene_id', activeScene.id);

    if (error) {
      toast.error('No se pudieron borrar los dibujos');
    }
  };

  const removeDrawing = async (drawingId: string) => {
    const { error } = await supabase
      .from('battle_map_drawings_simple')
      .delete()
      .eq('id', drawingId);

    if (error) {
      console.error('Error removing drawing:', error);
    }
  };

  return {
    activeScene,
    scenes,
    tokens,
    drawings,
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
  };
};
