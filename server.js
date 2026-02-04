const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json({ limit: '50mb' }));

// GET - Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'HTML to PDF Converter',
    version: '1.0.0',
    platform: 'Railway',
    endpoint: 'POST / com {html_final: "seu_html"}'
  });
});

// POST - Gerar PDF
app.post('/', async (req, res) => {
  let browser = null;

  try {
    const { html_final } = req.body;

    if (!html_final) {
      return res.status(400).json({ error: 'Campo html_final obrigatório' });
    }

    console.log('📦 Iniciando conversão HTML -> PDF');

    // Lançar browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();

    console.log('📄 Carregando conteúdo...');
    await page.setContent(html_final, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Aguarda renderização
    await new Promise(r => setTimeout(r, 1500));

    console.log('📝 Gerando PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20mm', 
        right: '15mm', 
        bottom: '20mm', 
        left: '15mm' 
      }
    });

    await browser.close();
    browser = null;

    console.log('✅ PDF gerado:', pdf.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    return res.send(pdf);

  } catch (error) {
    console.error('❌ Erro:', error.message);

    if (browser) {
      await browser.close().catch(() => {});
    }

    return res.status(500).json({
      error: 'Falha ao gerar PDF',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/`);
});
