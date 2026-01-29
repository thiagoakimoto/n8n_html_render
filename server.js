const http = require('http');
const handler = require('./api/index');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Simular objeto de request/response da Vercel
  const chunks = [];
  
  req.on('data', chunk => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    // Parse do body
    let body = {};
    if (chunks.length > 0) {
      const data = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(data);
      } catch (e) {
        body = {};
      }
    }

    // Criar objeto de request compatível com Vercel
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: body
    };

    // Criar objeto de response compatível com Vercel
    const mockRes = {
      statusCode: 200,
      headers: {},
      
      status(code) {
        this.statusCode = code;
        return this;
      },
      
      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },
      
      json(data) {
        this.headers['Content-Type'] = 'application/json';
        res.writeHead(this.statusCode, this.headers);
        res.end(JSON.stringify(data));
      },
      
      send(data) {
        res.writeHead(this.statusCode, this.headers);
        res.end(data);
      }
    };

    try {
      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('Erro no handler:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor local rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/api`);
  console.log(`\n💡 Exemplo de teste:\n`);
  console.log(`curl -X POST http://localhost:${PORT}/api \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"texto_markdown":"# Teste\\n\\nFórmula: $E=mc^2$"}' \\`);
  console.log(`  --output teste.pdf\n`);
});
