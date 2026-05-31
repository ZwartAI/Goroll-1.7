import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
      setActiveScene(data as SceneConfig);
    } else {
      // If no active scene, try to create one if it's DM (but here we just check if it exists)
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

    setScenes(data as SceneConfig[]);
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

    setTokens(data as MapToken[]);
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

    setDrawings(data as Drawing[]);
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

    // Subscribe to scene changes
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
          if (payload.eventType === 'UPDATE' && (payload.new as SceneConfig).is_active) {
            setActiveScene(payload.new as SceneConfig);
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
      return;
    }

    fetchTokens(activeScene.id);
    fetchDrawings(activeScene.id);

    const tokensSubscription = supabase
      .channel('battle_map_tokens')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_tokens_simple',
          filter: `scene_id=eq.${activeScene.id}`,
        },
        () => {
          fetchTokens(activeScene.id);
        }
      )
      .subscribe();

    const drawingsSubscription = supabase
      .channel('battle_map_drawings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_map_drawings_simple',
          filter: `scene_id=eq.${activeScene.id}`,
        },
        () => {
          fetchDrawings(activeScene.id);
        }
      )
      .subscribe();

    return () => {
      tokensSubscription.unsubscribe();
      drawingsSubscription.unsubscribe();
    };
  }, [activeScene?.id, fetchTokens, fetchDrawings]);

  const updateScene = async (updates: Partial<SceneConfig>) => {
    if (!activeScene) return;
    const { error } = await supabase
      .from('battle_map_scenes_simple')
      .update(updates)
      .eq('id', activeScene.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la escena',
        variant: 'destructive',
      });
    }
  };

  const createScene = async (name: string) => {
    const { data, error } = await supabase
      .from('battle_map_scenes_simple')
      .insert([
        {
          campaign_id: campaignId,
          name,
          is_active: scenes.length === 0, // Make it active if it's the first one
        },
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la escena',
        variant: 'destructive',
      });
    } else if (data.is_active) {
      setActiveScene(data as SceneConfig);
    }
    fetchScenes();
  };

  const activateScene = async (sceneId: string) => {
    // Set all other scenes to inactive
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
      toast({
        title: 'Error',
        description: 'No se pudo activar la escena',
        variant: 'destructive',
      });
    } else {
      setActiveScene(data as SceneConfig);
    }
  };

  const updateTokenPosition = async (tokenId: string, x: number, y: number) => {
    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .update({ x, y })
      .eq('id', tokenId);

    if (error) {
      console.error('Error updating token position:', error);
    }
  };

  const addToken = async (token: Partial<MapToken>) => {
    if (!activeScene) return;
    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .insert([{ ...token, campaign_id: campaignId, scene_id: activeScene.id }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo añadir el token',
        variant: 'destructive',
      });
    }
  };

  const removeToken = async (tokenId: string) => {
    const { error } = await supabase
      .from('battle_map_tokens_simple')
      .delete()
      .eq('id', tokenId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo retirar el token',
        variant: 'destructive',
      });
    }
  };

  const addDrawing = async (drawing: Partial<Drawing>) => {
    if (!activeScene) return;
    const { error } = await supabase
      .from('battle_map_drawings_simple')
      .insert([{ ...drawing, campaign_id: campaignId, scene_id: activeScene.id }]);

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
      toast({
        title: 'Error',
        description: 'No se pudieron borrar los dibujos',
        variant: 'destructive',
      });
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
    addToken,
    removeToken,
    addDrawing,
    clearDrawings,
  };
};
