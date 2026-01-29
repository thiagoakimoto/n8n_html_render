# 📄 PDF Generator API

Micro API Serverless para geração de PDFs a partir de Markdown, fórmulas matemáticas LaTeX e imagens de capa em Base64.

## 🚀 Funcionalidades

- ✅ Conversão de **Markdown** para PDF
- ✅ Renderização de **fórmulas matemáticas LaTeX** (inline e display)
- ✅ Suporte a **imagem de capa** em Base64
- ✅ Execução **serverless** na Vercel
- ✅ Otimizado para rodar dentro do limite de AWS Lambda (Chromium compactado)
- ✅ Template HTML profissional com estilos responsivos

## 🛠️ Tecnologias

- **Node.js** 18+
- **Puppeteer Core** - Controle headless do Chrome
- **@sparticuz/chromium** - Chromium otimizado para serverless
- **Marked.js** - Parser de Markdown
- **MathJax 3** - Renderização de LaTeX
- **Vercel** - Plataforma serverless

## 📦 Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>
cd gerador_html

# Instale as dependências
npm install
```

## 🏃 Execução Local

```bash
# Modo desenvolvimento
npm run dev

# A API estará disponível em http://localhost:3000/api
```

## 🌐 Deploy na Vercel

```bash
# Deploy em produção
npm run deploy

# Ou conecte seu repositório GitHub na Vercel
# para deploy automático a cada push
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/seu-repo)

## 📡 Como Usar

### Endpoint

```
POST /api
```

### Body da Requisição

```json
{
  "texto_markdown": "# Seu Título\n\nTexto com fórmula $E = mc^2$",
  "imagem_capa_base64": "data:image/png;base64,iVBORw0KG..."
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `texto_markdown` | string | ✅ Sim | Conteúdo em Markdown com suporte a LaTeX |
| `imagem_capa_base64` | string | ❌ Não | Imagem da capa em formato Base64 (data URI) |

### Exemplo de Requisição (cURL)

```bash
curl -X POST https://sua-api.vercel.app/api \
  -H "Content-Type: application/json" \
  -d '{
    "texto_markdown": "# Relatório Científico\n\n## Fórmula de Einstein\n\nA famosa equação é: $E = mc^2$\n\n## Integral de Gauss\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$",
    "imagem_capa_base64": "data:image/png;base64,..."
  }' \
  --output documento.pdf
```

### Exemplo de Requisição (JavaScript/Fetch)

```javascript
const response = await fetch('https://sua-api.vercel.app/api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    texto_markdown: `
# Título do Documento

## Introdução

Este é um exemplo de documento com **Markdown** e fórmulas matemáticas.

### Fórmula Inline

A velocidade da luz é representada por $c = 3 \\times 10^8$ m/s.

### Fórmula em Bloco

$$
\\frac{d}{dx}\\left( \\int_{0}^{x} f(u)\\,du\\right)=f(x)
$$

## Lista de Itens

- Item 1
- Item 2
- Item 3

## Código

\`\`\`javascript
console.log('Hello World');
\`\`\`
    `,
    imagem_capa_base64: 'data:image/png;base64,...'
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'documento.pdf';
a.click();
```

### Exemplo de Requisição (Python)

```python
import requests
import base64

# Ler imagem e converter para base64
with open('capa.png', 'rb') as img:
    img_base64 = f"data:image/png;base64,{base64.b64encode(img.read()).decode()}"

payload = {
    "texto_markdown": "# Título\n\nFórmula: $E = mc^2$",
    "imagem_capa_base64": img_base64
}

response = requests.post(
    'https://sua-api.vercel.app/api',
    json=payload
)

with open('documento.pdf', 'wb') as f:
    f.write(response.content)
```

## 📝 Sintaxe LaTeX Suportada

### Fórmulas Inline

```markdown
Texto com fórmula $E = mc^2$ no meio da frase.
```

### Fórmulas em Bloco

```markdown
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

### Exemplos de Fórmulas

- Frações: `$\frac{a}{b}$`
- Raízes: `$\sqrt{x}$`
- Somatórios: `$\sum_{i=1}^{n} i$`
- Integrais: `$\int_a^b f(x) dx$`
- Matrizes: `$\begin{matrix} a & b \\ c & d \end{matrix}$`
- Vetores: `$\vec{v} = \langle x, y, z \rangle$`

## 📂 Estrutura do Projeto

```
gerador_html/
├── api/
│   └── index.js          # Função serverless principal
├── node_modules/         # Dependências (git ignored)
├── .gitignore           # Arquivos ignorados pelo Git
├── package.json         # Configurações e dependências
├── vercel.json          # Configuração da Vercel
└── README.md            # Documentação
```

## ⚙️ Configurações da Vercel

O projeto está configurado com:
- **Timeout**: 60 segundos
- **Memória**: 1024 MB
- **Região**: GRU1 (São Paulo)

Essas configurações são necessárias para garantir que o Chromium tenha recursos suficientes para renderizar documentos complexos.

## 🔧 Solução de Problemas

### Timeout ao gerar PDF

Se você está recebendo erros de timeout:
- Reduza a complexidade do documento
- Divida documentos grandes em múltiplas requisições
- Aumente o `maxDuration` em `vercel.json` (planos Pro)

### Fórmulas não renderizam

Certifique-se de:
- Usar a sintaxe correta do LaTeX
- Escapar caracteres especiais quando necessário
- Verificar se o MathJax está carregando corretamente

### Erro de memória

- Reduza o tamanho da imagem de capa
- Otimize imagens antes de converter para Base64
- Considere usar URLs de imagens em vez de Base64

## 📄 Licença

MIT

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

Desenvolvido com ❤️ para facilitar a geração de documentos científicos e técnicos.
