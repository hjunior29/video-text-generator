# Arquitetura: Sistema de Text Layers

## Visão Geral

O sistema permite adicionar múltiplas camadas de texto ao vídeo, cada uma com:
- Tempo de início e fim
- Posição na tela (x, y)
- Estilo visual (cor, fonte, tamanho, stroke)
- Animações de entrada/saída
- Efeito karaoke opcional (para legendas)

## Formato JSON das Layers

```json
{
  "layers": [
    {
      "id": "title-1",
      "type": "text",
      "content": "MEU TÍTULO INCRÍVEL",
      "startMs": 0,
      "endMs": 3000,
      "position": {
        "x": 50,
        "y": 20,
        "anchor": "center"
      },
      "style": {
        "fontSize": 72,
        "fontFamily": "TheBoldFont",
        "color": "#FFFFFF",
        "strokeColor": "#000000",
        "strokeWidth": 5,
        "textTransform": "uppercase",
        "letterSpacing": 2,
        "shadow": {
          "color": "#000000",
          "blur": 10,
          "offsetX": 2,
          "offsetY": 2
        }
      },
      "animation": {
        "enter": {
          "type": "fadeUp",
          "duration": 500,
          "easing": "easeOut"
        },
        "exit": {
          "type": "fadeDown",
          "duration": 300,
          "easing": "easeIn"
        }
      }
    },
    {
      "id": "subtitle-layer",
      "type": "caption",
      "source": "whisper",
      "position": {
        "x": 50,
        "y": 85,
        "anchor": "center"
      },
      "style": {
        "fontSize": 48,
        "color": "#FFFFFF",
        "highlightColor": "#39E508",
        "strokeWidth": 5
      },
      "karaoke": true
    },
    {
      "id": "cta-text",
      "type": "text",
      "content": "SIGA PARA MAIS!",
      "startMs": 5000,
      "endMs": 8000,
      "position": {
        "x": 50,
        "y": 50,
        "anchor": "center"
      },
      "style": {
        "fontSize": 56,
        "color": "#FF0000",
        "strokeWidth": 3
      },
      "animation": {
        "enter": {
          "type": "bounceIn",
          "duration": 400
        },
        "loop": {
          "type": "pulse",
          "duration": 1000,
          "repeat": true
        }
      }
    }
  ]
}
```

## Tipos de Layer

### 1. `text` - Texto Estático
Texto que aparece em um período específico.

```json
{
  "type": "text",
  "content": "Texto aqui",
  "startMs": 1000,
  "endMs": 5000
}
```

### 2. `caption` - Legendas com Karaoke
Legendas geradas pelo Whisper com efeito karaoke.

```json
{
  "type": "caption",
  "source": "whisper",
  "karaoke": true,
  "highlightColor": "#FF0000"
}
```

### 3. `animated-text` - Texto com Animação Contínua
Texto com animação em loop.

```json
{
  "type": "animated-text",
  "content": "PROMOÇÃO!",
  "animation": {
    "loop": {
      "type": "shake",
      "intensity": 5
    }
  }
}
```

## Sistema de Posicionamento

### Coordenadas (x, y)
- Valores em **porcentagem** (0-100)
- `x: 50, y: 50` = centro da tela
- `x: 0, y: 0` = canto superior esquerdo

### Anchor Points
```
topLeft      top       topRight
   ●──────────●──────────●
   │                     │
left●        center      ●right
   │          ●          │
   │                     │
   ●──────────●──────────●
bottomLeft  bottom   bottomRight
```

## Animações Disponíveis

### Entrada (enter)
| Tipo | Descrição |
|------|-----------|
| `fadeIn` | Fade simples |
| `fadeUp` | Fade + slide de baixo |
| `fadeDown` | Fade + slide de cima |
| `fadeLeft` | Fade + slide da direita |
| `fadeRight` | Fade + slide da esquerda |
| `bounceIn` | Bounce elástico |
| `scaleIn` | Escala de 0 para 1 |
| `typewriter` | Letra por letra |
| `splitIn` | Letras vêm de direções diferentes |

### Saída (exit)
| Tipo | Descrição |
|------|-----------|
| `fadeOut` | Fade simples |
| `fadeUp` | Fade + slide para cima |
| `fadeDown` | Fade + slide para baixo |
| `scaleOut` | Escala de 1 para 0 |
| `blur` | Desfoca e desaparece |

### Loop (durante exibição)
| Tipo | Descrição |
|------|-----------|
| `pulse` | Pulsa escala |
| `shake` | Tremor |
| `glow` | Brilho pulsante |
| `float` | Flutua suavemente |
| `rainbow` | Cor muda em gradiente |

## Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────┐
│                     INPUT                                    │
├─────────────────────────────────────────────────────────────┤
│  video: Path (arquivo de vídeo)                             │
│  layers_json: str (JSON com configuração das layers)        │
│  generate_captions: bool (usar Whisper para legendas)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  1. PARSE & VALIDATE                         │
├─────────────────────────────────────────────────────────────┤
│  - Parse JSON string para objeto Python                      │
│  - Validar estrutura e tipos                                 │
│  - Aplicar defaults para campos não especificados           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              2. WHISPER (se generate_captions=true)          │
├─────────────────────────────────────────────────────────────┤
│  - Transcrever áudio                                         │
│  - Extrair timestamps por palavra                            │
│  - Injetar dados na layer type="caption"                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 3. PREPARE FOR REMOTION                      │
├─────────────────────────────────────────────────────────────┤
│  - Salvar layers processadas em JSON                         │
│  - Copiar vídeo para public/                                 │
│  - Preparar props para renderização                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    4. REMOTION RENDER                        │
├─────────────────────────────────────────────────────────────┤
│  - Carregar vídeo base                                       │
│  - Para cada frame:                                          │
│    - Renderizar vídeo                                        │
│    - Para cada layer visível no frame atual:                │
│      - Calcular animação de entrada/saída                   │
│      - Aplicar estilos                                       │
│      - Renderizar texto com efeitos                         │
│  - Encodar vídeo final                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       OUTPUT                                 │
├─────────────────────────────────────────────────────────────┤
│  Path: vídeo renderizado com todas as layers                │
└─────────────────────────────────────────────────────────────┘
```

## Exemplo de Uso via API

### Python
```python
import replicate
import json

layers = {
    "layers": [
        {
            "id": "title",
            "type": "text",
            "content": "REACT HOOKS EXPLICADO",
            "startMs": 0,
            "endMs": 4000,
            "position": {"x": 50, "y": 15, "anchor": "center"},
            "style": {
                "fontSize": 64,
                "color": "#FFFFFF",
                "strokeWidth": 4
            },
            "animation": {
                "enter": {"type": "bounceIn", "duration": 500}
            }
        },
        {
            "id": "captions",
            "type": "caption",
            "source": "whisper",
            "position": {"x": 50, "y": 85, "anchor": "center"},
            "style": {
                "fontSize": 48,
                "highlightColor": "#00FF00"
            },
            "karaoke": True
        },
        {
            "id": "subscribe",
            "type": "text",
            "content": "INSCREVA-SE!",
            "startMs": 8000,
            "endMs": 12000,
            "position": {"x": 50, "y": 50, "anchor": "center"},
            "style": {
                "fontSize": 72,
                "color": "#FF0000"
            },
            "animation": {
                "enter": {"type": "scaleIn", "duration": 300},
                "loop": {"type": "pulse", "duration": 800}
            }
        }
    ]
}

output = replicate.run(
    "your-username/video-text-generator",
    input={
        "video": open("video.mp4", "rb"),
        "layers_json": json.dumps(layers),
        "generate_captions": True
    }
)
```

### cURL
```bash
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "YOUR_VERSION",
    "input": {
      "video": "https://example.com/video.mp4",
      "layers_json": "{\"layers\":[{\"id\":\"title\",\"type\":\"text\",\"content\":\"HELLO\",\"startMs\":0,\"endMs\":3000,\"position\":{\"x\":50,\"y\":20},\"style\":{\"fontSize\":64}}]}",
      "generate_captions": true
    }
  }'
```

## Defaults Automáticos

Se um campo não for especificado, estes são os valores padrão:

```json
{
  "position": {
    "x": 50,
    "y": 50,
    "anchor": "center"
  },
  "style": {
    "fontSize": 48,
    "fontFamily": "TheBoldFont",
    "color": "#FFFFFF",
    "strokeColor": "#000000",
    "strokeWidth": 3,
    "textTransform": "none",
    "letterSpacing": 0
  },
  "animation": {
    "enter": {
      "type": "fadeIn",
      "duration": 300,
      "easing": "easeOut"
    },
    "exit": {
      "type": "fadeOut",
      "duration": 200,
      "easing": "easeIn"
    }
  }
}
```

## Presets de Estilo

Para facilitar, podemos definir presets:

```python
# No predict.py
style_preset: str = Input(
    default="custom",
    choices=["custom", "tiktok", "capcut", "youtube", "instagram"],
    description="Preset de estilo (sobrescrito por layers_json se definido)"
)
```

Os presets aplicam configurações automáticas quando `type="caption"`.
