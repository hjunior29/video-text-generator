# Análise do Projeto cog-template-tiktok

## Visão Geral

O **cog-template-tiktok** é um sistema de legendagem de vídeos que combina:
- **OpenAI Whisper** para transcrição de áudio com timestamps por palavra
- **Remotion** para renderização de vídeo com legendas animadas estilo TikTok

É implantado como modelo Cog no Replicate.

---

## Estrutura do Projeto

```
cog-template-tiktok/
├── predict.py              # Predictor Python (backend ML)
├── cog.yaml               # Configuração Cog
├── package.json           # Dependências Node.js
├── tsconfig.json          # Configuração TypeScript
├── remotion.config.ts     # Config renderização Remotion
├── whisper-config.mjs     # Configuração Whisper.cpp
├── sub.mjs                # Script alternativo de legendas
├── src/                   # Componentes React/Remotion
│   ├── Root.tsx          # Composição raiz
│   ├── index.ts          # Entry point
│   ├── load-font.ts      # Carregador de fonte custom
│   └── CaptionedVideo/   # Componentes de legenda
│       ├── index.tsx     # Componente principal
│       ├── Page.tsx      # Página individual de legenda
│       ├── SubtitlePage.tsx # Wrapper com animações
│       └── NoCaptionFile.tsx # Fallback
├── public/               # Assets estáticos
│   ├── sample-video.mp4  # Vídeo exemplo
│   └── theboldfont.ttf   # Fonte customizada
└── .github/workflows/    # CI/CD
    └── push.yaml        # Deploy para Replicate
```

---

## Tecnologias Utilizadas

### Backend (Python)
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Cog | 0.10.0a15 | Framework de deploy |
| OpenAI Whisper | 20231106 | Transcrição de áudio |
| PyTorch | 2.0.1 | Deep learning |
| FFmpeg | - | Processamento de vídeo/áudio |
| Transformers | 4.35.0 | Modelos ML |

### Frontend (TypeScript/React)
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Remotion | 4.0.0 | Renderização de vídeo |
| React | 18.3.1 | UI |
| TypeScript | 5.5.4 | Tipagem |
| Zod | 3.22.3 | Validação de schema |

### Runtime
- **Bun**: Runtime JavaScript rápido
- **GPU**: CUDA para inferência Whisper

---

## Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────────┐
│                        PIPELINE PRINCIPAL                        │
└─────────────────────────────────────────────────────────────────┘

1. INPUT: Vídeo (MP4/MKV/MOV/WebM)
                ↓
2. [FFprobe] Extrai duração do áudio
                ↓
3. [Whisper] Transcreve áudio → timestamps por palavra
                ↓
4. [format_whisper_results()] Formata JSON:
   {
     "text": "palavra",
     "startMs": 1000,
     "endMs": 1500,
     "confidence": 0.95,
     "timestampMs": 1500
   }
                ↓
5. Salva JSON em /src/public/{hash}.json
                ↓
6. Copia vídeo para /src/public/{hash}.mp4
                ↓
7. [Remotion] Renderiza vídeo com legendas animadas
                ↓
8. OUTPUT: /src/out/{hash}_captioned.mp4
```

---

## Sistema de Legendas (Detalhe)

### Agrupamento de Palavras
- Palavras são agrupadas em "páginas" de ~1200ms
- Cada página exibe múltiplas palavras
- Transição suave entre páginas

### Estilização Visual
```typescript
// Efeitos aplicados às legendas:

1. POSIÇÃO: Bottom 10% da tela
2. FONTE: TheBoldFont (custom bold)
3. TEXTO: Uppercase
4. STROKE: 5px preto (outline)
5. COR BASE: Branco (#FFFFFF)
6. COR HIGHLIGHT: Verde (#39E508) - palavra ativa
7. LARGURA: 90% da tela
8. ANIMAÇÃO: Spring scale (0.8 → 1.0)
```

### Efeito Karaoke
```typescript
// Page.tsx - Highlight da palavra ativa
tokens.map((token) => {
  const isActive = currentTime >= token.startMs && currentTime < token.endMs;
  return (
    <span style={{ color: isActive ? highlightColor : "white" }}>
      {token.text}
    </span>
  );
});
```

### Animação de Entrada
```typescript
// SubtitlePage.tsx - Spring animation
const enterProgress = spring({
  fps,
  frame,
  config: { damping: 200 },
  durationInFrames: 5,
});

// Aplica scale e translate
transform: `scale(${0.8 + enterProgress * 0.2}) translateY(${(1 - enterProgress) * 50}px)`
```

---

## Parâmetros de Entrada

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| video | Path | Obrigatório | Arquivo de vídeo |
| caption_size | int | 30 | Palavras por janela |
| highlight_color | str | #39E508 | Cor do highlight |
| model | str | large-v3 | Modelo Whisper |
| language | str | auto | Idioma ou auto-detect |
| temperature | float | 0 | Temperatura sampling |

---

## Dependências

### Python (cog.yaml)
```
numpy==1.23.5
torch==2.0.1
tqdm==4.66.1
more-itertools==10.1.0
transformers==4.35.0
ffmpeg-python==0.2.0
openai-whisper==20231106
cog==0.10.0a15
```

### Node.js (package.json)
```
@remotion/cli@^4.0.0
@remotion/layout-utils@^4.0.0
@remotion/media-utils@^4.0.0
react@18.3.1
remotion@^4.0.0
zod@3.22.3
typescript@5.5.4
```

### Sistema
```
ffmpeg
libatk1.0-0
libcups2
libxkbcommon-x11-0
libgbm1
libpango-1.0-0
libcairo2
```

---

## Pontos Fortes

1. **Precisão por Palavra**: Timestamps exatos via Whisper
2. **Estilo TikTok**: Animações spring, outline, highlight
3. **Fonte Custom**: Bold para impacto visual
4. **Multi-idioma**: 99+ idiomas suportados
5. **GPU Otimizado**: Inferência rápida com CUDA
6. **Pronto para Deploy**: Integração Replicate

---

## Melhorias Planejadas para video-text-generator

### 1. Posicionamento Flexível
```typescript
// Novo parâmetro: position
position: "top" | "center" | "bottom" | "custom"
customPosition: { x: number, y: number }
```

### 2. Estilos Visuais Avançados
```typescript
// Novos estilos:
- Gradiente no texto
- Sombra drop shadow
- Background blur/solid
- Emoji suporte
- Múltiplas linhas
```

### 3. Animações Karaoke Melhoradas
```typescript
// Efeitos adicionais:
- Word-by-word scale bounce
- Color wave effect
- Glow pulsante
- Slide in/out
```

### 4. Presets de Estilo
```typescript
presets: {
  "tiktok": { ... },
  "capcut": { ... },
  "instagram": { ... },
  "youtube": { ... },
  "minimal": { ... }
}
```

---

## Arquivos Chave para Estudar

1. **predict.py**: Lógica principal Python
2. **src/CaptionedVideo/index.tsx**: Lógica de legendas
3. **src/CaptionedVideo/Page.tsx**: Estilização visual
4. **src/CaptionedVideo/SubtitlePage.tsx**: Animações
5. **cog.yaml**: Configuração de infraestrutura

---

## Comandos Úteis

```bash
# Testar localmente
cog predict -i video=@input.mp4 -i caption_size=30 -i highlight_color="#FF0000"

# Build do Remotion
bun run build

# Preview Remotion
bun run studio

# Deploy para Replicate
cog push r8.im/username/model-name
```
