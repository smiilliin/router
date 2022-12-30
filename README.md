# Router

내부 서버들(포트)을 프록시로 연결시켜주는 앱입니다!

## 사용법

src/bind.json

```json
{
  "(/이름)": 12345 //(포트)
}
//이름이 index인것은 "/" 경로 포트에요!
```

.env

```
CERT_PATH=(인증서 cert 경로)
KEY_PATH=(인증서 key 경로)
```

설치

```bash
npm install

npm run build
```

실행

```bash
./run.sh
```

죽이기

```bash
./kill.sh
```
