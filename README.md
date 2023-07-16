# Router - Connects internal servers as a reverse proxy!

## Usage

src/bind.json

```json
{
  "asdf": 12345,
  "qwerty": 12346
  "index": 8080
}
```

asdf.example.com -> localhost:12345  
qwerty.example.com -> localhost:12346  
index.example.com -> localhost:8080

.env

```
CERT_PATH=(Cert path)
KEY_PATH=(Key path)
HOST=example.com
```

## Install

```bash
npm install

tsc
```
