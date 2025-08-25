import mermaid from 'mermaid';
import fs from 'fs';
import path from 'path';

/**
 * Utility class for rendering Mermaid diagrams
 */
export class MermaidRenderer {
  private initialized = false;

  constructor() {
    this.initializeMermaid();
  }

  /**
   * Initialize Mermaid with configuration
   */
  private initializeMermaid(): void {
    if (this.initialized) return;

    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      themeVariables: {
        primaryColor: '#4a90e2',
        primaryTextColor: '#333',
        primaryBorderColor: '#4a90e2',
        lineColor: '#333',
        secondaryColor: '#f0f0f0',
        tertiaryColor: '#e1f5fe'
      }
    });

    this.initialized = true;
  }

  /**
   * Render Mermaid diagram to HTML
   */
  async renderToHTML(mermaidCode: string, title: string = 'ER Diagram'): Promise<string> {
    try {
      // Extract the actual Mermaid code from the markdown code block
      const cleanCode = this.extractMermaidCode(mermaidCode);
      
      if (!cleanCode) {
        throw new Error('No valid Mermaid code found');
      }

      // Generate a unique ID for the diagram
      const diagramId = `mermaid-diagram-${Date.now()}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.10.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #4a90e2;
            padding-bottom: 10px;
        }
        .diagram-container {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #fafbfc;
        }
        .mermaid {
            text-align: center;
        }
        .info {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .download-btn {
            display: inline-block;
            background: #4a90e2;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 10px 5px;
        }
        .download-btn:hover {
            background: #357abd;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        
        <div class="info">
            <strong>💡 Interactive Diagram:</strong> This diagram is rendered using Mermaid.js. 
            You can zoom, pan, and interact with the diagram elements.
        </div>

        <div class="diagram-container">
            <div class="mermaid" id="${diagramId}">
${cleanCode}
            </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
            <a href="#" onclick="downloadSVG()" class="download-btn">📥 Download SVG</a>
            <a href="#" onclick="downloadPNG()" class="download-btn">📥 Download PNG</a>
        </div>

        <script>
            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: true,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'Arial, sans-serif',
                fontSize: 14
            });

            // Download functions
            function downloadSVG() {
                const svg = document.querySelector('#${diagramId} svg');
                if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const blob = new Blob([svgData], {type: 'image/svg+xml'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.svg';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }

            function downloadPNG() {
                const svg = document.querySelector('#${diagramId} svg');
                if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    img.onload = function() {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        const pngUrl = canvas.toDataURL('image/png');
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = '${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png';
                        a.click();
                    };
                    
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                }
            }
        </script>
    </div>
</body>
</html>`;

      return html;
    } catch (error) {
      throw new Error(`Failed to render Mermaid diagram: ${error}`);
    }
  }

  /**
   * Extract Mermaid code from markdown code block
   */
  private extractMermaidCode(markdownCode: string): string | null {
    // Remove markdown code block markers
    const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/;
    const match = markdownCode.match(mermaidBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If no markdown block, assume it's already clean Mermaid code
    return markdownCode.trim();
  }

  /**
   * Save HTML diagram to file
   */
  async saveHTMLDiagram(mermaidCode: string, title: string, outputPath?: string): Promise<string> {
    try {
      const html = await this.renderToHTML(mermaidCode, title);
      
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram_${Date.now()}.html`;
      const filePath = outputPath || path.join(process.cwd(), 'diagrams', fileName);
      
      // Ensure diagrams directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, html);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save HTML diagram: ${error}`);
    }
  }

  /**
   * Generate a simple HTML viewer for multiple diagrams
   */
  async generateDiagramViewer(diagrams: Array<{title: string, code: string, format: string}>): Promise<string> {
    try {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Schema Diagrams</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.10.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .diagram-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .diagram-container {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #fafbfc;
            overflow-x: auto;
        }
        .mermaid {
            text-align: center;
        }
        .nav-tabs {
            display: flex;
            border-bottom: 1px solid #e1e5e9;
            margin-bottom: 20px;
        }
        .nav-tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            border-bottom: 2px solid transparent;
        }
        .nav-tab.active {
            border-bottom-color: #4a90e2;
            color: #4a90e2;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗺️ Database Schema Diagrams</h1>
            <p>Interactive diagrams generated by PeerAI MongoMigrator</p>
        </div>

        <div class="nav-tabs">
${diagrams.map((_, index) => `
            <button class="nav-tab ${index === 0 ? 'active' : ''}" onclick="showTab(${index})">
                ${diagrams[index].title}
            </button>
`).join('')}
        </div>

${diagrams.map((diagram, index) => `
        <div class="tab-content ${index === 0 ? 'active' : ''}" id="tab-${index}">
            <div class="diagram-section">
                <h2>${diagram.title}</h2>
                <div class="diagram-container">
                    <div class="mermaid">
${this.extractMermaidCode(diagram.code)}
                    </div>
                </div>
            </div>
        </div>
`).join('')}

        <script>
            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: true,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'Arial, sans-serif',
                fontSize: 14
            });

            function showTab(index) {
                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.nav-tab').forEach(tab => {
                    tab.classList.remove('active');
                });

                // Show selected tab
                document.getElementById('tab-' + index).classList.add('active');
                document.querySelectorAll('.nav-tab')[index].classList.add('active');
            }
        </script>
    </div>
</body>
</html>`;

      return html;
    } catch (error) {
      throw new Error(`Failed to generate diagram viewer: ${error}`);
    }
  }
}
