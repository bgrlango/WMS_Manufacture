# 🔴 Analisis Error: s.yaml Node.js di Alibaba FC

## MASALAH DITEMUKAN

### 1️⃣ **HANDLER SALAH (CRITICAL ERROR)**
```yaml
handler: index.handler              # ❌ SALAH - ini adalah format untuk Node.js default runtime
```

**Masalah:**
- Anda menggunakan `runtime: custom.debian10` (custom runtime)
- Tapi handler masih menggunakan `index.handler` (format untuk built-in Node.js runtime)
- Ini akan menyebabkan: **Handler not found: index.handler**

**Solusi:**
Untuk custom runtime dengan `npm run fc:start`, handler harus sesuai dengan entry point:
```yaml
handler: bootstrap.http_handler      # ✅ atau sesuai entry point di kode
# atau
handler: server.handler             # ✅ tergantung entry file
```

---

### 2️⃣ **CUSTOM RUNTIME COMMAND SALAH**
```yaml
customRuntimeConfig:
  port: 9000
  command:
    - npm
    - run
    - fc:start                       # ❌ Menjalankan npm script
```

**Masalah:**
- Perintah `npm run fc:start` dijalankan sebagai entry point
- Tapi tidak ada handler definition yang jelas untuk Alibaba FC
- FC tidak tahu bagaimana meRoute request HTTP

**Solusi - Opsi A (Recommended):**
```yaml
customRuntimeConfig:
  port: 9000
  command:
    - node
    - bootstrap.js                   # ✅ Jalankan bootstrap.js langsung
```

**Solusi - Opsi B:**
```yaml
customRuntimeConfig:
  port: 9000
  command:
    - npm
    - run
    - fc:start
# Tapi pastikan package.json punya:
# "fc:start": "node bootstrap.js"
# Dan bootstrap.js export handler function
```

---

### 3️⃣ **CODE PATH TIDAK JELAS**
```yaml
code: ./runtime                      # ⚠️  Ambiguous - mana bootstrap.js?
```

**Masalah:**
- Tidak tahu apakah structure nya:
  - `runtime/bootstrap.js` ← bootstrap file
  - `runtime/index.js` ← entry point
  - Atau hierarchy lainnya?

**Solusi:**
Pastikan struktur:
```
runtime/
├── bootstrap.js                    ← Entry point (handler di sini)
├── package.json
├── node_modules/
└── src/
    └── server.js                   ← Aplikasi actual
```

---

### 4️⃣ **HANDLER MISMATCH DENGAN COMMAND**
```yaml
handler: index.handler              # ❌ Mencari index.handler
command:
  - npm
  - run
  - fc:start                         # ❌ Menjalankan npm script
```

**Masalah:**
- `handler: index.handler` → Alibaba FC mencari file `index.js` dengan export `handler`
- `npm run fc:start` → Menjalankan script di package.json
- **Ini TIDAK cocok!** Salah satunya harus diganti

**Solusi:**
Pilih satu dari dua pendekatan:

**Pendekatan A: Direct Node.js (RECOMMENDED)**
```yaml
customRuntimeConfig:
  port: 9000
  command:
    - node
    - bootstrap.js

handler: bootstrap.handler         # ← bootstrap.js harus export handler
```

**Pendekatan B: NPM Script (jika package.json ada)**
```yaml
customRuntimeConfig:
  port: 9000
  command:
    - npm
    - run
    - fc:start

handler: bootstrap.handler         # ← bootstrap.js harus export handler
# package.json:
# "fc:start": "node bootstrap.js"
```

---

### 5️⃣ **NODE_PATH CONFIGURATION**
```yaml
NODE_PATH: /opt/nodejs/node_modules    # ⚠️ Kemungkinan tidak ada di Debian10
```

**Masalah:**
- `NODE_PATH` deprecated di Node.js modern
- `/opt/nodejs/node_modules` mungkin tidak exist di custom runtime

**Solusi:**
Hapus atau ganti dengan proper NODE_PATH:
```yaml
NODE_PATH: /code/node_modules:/opt/nodejs/node_modules
# Lebih baik: gunakan npm/yarn yang sudah resolve modules
```

---

### 6️⃣ **PATH CONFIGURATION KURANG TEPAT**
```yaml
PATH: >-
  /var/fc/lang/nodejs18/bin:/usr/local/bin/apache-maven/bin:/usr/local/bin:...
```

**Masalah:**
- `/var/fc/lang/nodejs18/bin` - ini untuk built-in runtime, bukan custom
- Untuk custom runtime Debian10, PATH berbeda

**Solusi untuk Custom Runtime:**
```yaml
PATH: >-
  /usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/opt/bin:/code:/code/bin
```

---

## 🔧 PERBAIKAN LENGKAP

### ❌ Konfigurasi SAAT INI (ERROR):
```yaml
resources:
  fcDemo:
    component: fc3
    props:
      runtime: custom.debian10
      handler: index.handler              # ❌ SALAH!
      customRuntimeConfig:
        port: 9000
        command:
          - npm
          - run
          - fc:start                      # ❌ Tidak cocok dengan handler!
      code: ./runtime
```

### ✅ Konfigurasi YANG BENAR:

**Option 1: Direct Node.js Entry Point**
```yaml
resources:
  fcDemo:
    component: fc3
    props:
      region: ap-southeast-5
      functionName: nodejs-api
      runtime: custom.debian10
      handler: bootstrap.handler          # ✅ Harus match dengan export
      timeout: 30
      diskSize: 512
      memorySize: 512
      cpu: 0.5
      
      customRuntimeConfig:
        port: 9000
        command:
          - node                          # ✅ Direct Node.js
          - bootstrap.js                  # ✅ Entry point
      
      code: ./runtime                     # ✅ Folder dengan bootstrap.js
      
      environmentVariables:
        NODE_ENV: production
        NODE_PATH: /code/node_modules
        PATH: /usr/local/bin:/usr/bin:/bin:/opt/bin:/code:/code/bin
        LD_LIBRARY_PATH: /code/lib:/usr/lib:/opt/lib
      
      triggers:
        - triggerName: http
          triggerType: http
          triggerConfig:
            methods: [GET, POST, PUT, DELETE]
            authType: anonymous
```

**Option 2: NPM Script**
```yaml
resources:
  fcDemo:
    component: fc3
    props:
      runtime: custom.debian10
      handler: bootstrap.handler          # ✅ bootstrap.js export handler
      
      customRuntimeConfig:
        port: 9000
        command:
          - npm
          - run
          - fc:start                      # ✅ Pastikan ada di package.json!
      
      code: ./runtime
      
      # package.json harus punya:
      # "scripts": {
      #   "fc:start": "node bootstrap.js"
      # }
```

---

## 📋 BOOTSTRAP.JS YANG BENAR

Untuk kedua option di atas, `runtime/bootstrap.js` harus:

```javascript
// bootstrap.js
const http = require('http');

// Handler function untuk Alibaba FC
async function handler(request, response) {
    try {
        // Parse request
        const { method, url, headers } = request;
        
        // Routing logic
        if (method === 'GET' && url === '/health') {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ status: 'ok' }));
        } else if (method === 'POST' && url.startsWith('/api/')) {
            // Your API logic
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ message: 'API response' }));
        } else {
            response.writeHead(404);
            response.end('Not Found');
        }
    } catch (error) {
        console.error('Handler error:', error);
        response.writeHead(500);
        response.end('Internal Server Error');
    }
}

// Export handler untuk Alibaba FC
module.exports = { handler };

// Atau jika menggunakan npm run fc:start:
// Jalankan server
if (require.main === module) {
    const PORT = process.env.FC_PORT || 9000;
    const server = http.createServer(handler);
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server listening on port ${PORT}`);
    });
}
```

---

## 🎯 LANGKAH PERBAIKAN

1. **Update s.yaml:**
   ```yaml
   handler: bootstrap.handler          # ✅ Ganti dari index.handler
   command:
     - node                            # ✅ Ganti dari npm run
     - bootstrap.js
   ```

2. **Pastikan file structure:**
   ```
   runtime/
   ├── bootstrap.js                    ← Export { handler }
   ├── package.json                    ← npm dependencies
   └── node_modules/
   ```

3. **Test locally:**
   ```bash
   cd runtime
   npm install
   node bootstrap.js
   # Expected: ✅ Server listening on port 9000
   ```

4. **Deploy:**
   ```bash
   fun deploy
   ```

---

## 🚨 RINGKASAN ERROR

| Error | Penyebab | Solusi |
|-------|----------|--------|
| Handler not found | `handler: index.handler` tapi tidak ada index.js | Ubah ke `handler: bootstrap.handler` |
| Entry point salah | `npm run fc:start` tidak cocok dengan handler | Ubah command ke `node bootstrap.js` |
| Module tidak ketemu | NODE_PATH deprecated | Hapus atau set ke `/code/node_modules` |
| PATH issues | Using built-in Node.js path | Gunakan Debian10 standard paths |
| Code path ambiguous | `./runtime` tidak jelas strukturnya | Pastikan `bootstrap.js` ada di `./runtime/` |

---

**Status:** 🔴 **ERROR CRITICAL - Perlu perbaikan sebelum deploy**

File ini akan FAIL jika di-deploy dengan konfigurasi saat ini!
