# Router

Connects internal servers(ports) as a proxy!

## Useage

src/bind.json

```json
{
  "asdf": 12345,
  "qwerty": 12346
  "index": 8080
}
```

/asdf -> localhost:12345  
/qwerty -> localhost:12346  
/ -> localhost:8080

.env

```
CERT_PATH=(Cert path)
KEY_PATH=(Key path)
TYPE=(http or https)
```

## Install

```bash
npm install

npm run build
```

## Execuse

```bash
./run.sh
```

## Kill

```bash
./kill.sh
```
