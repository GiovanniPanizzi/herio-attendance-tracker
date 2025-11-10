# Registro Presenze SIGI

App desktop sviluppata con **Electron** e **Node.js** per gestire classi, studenti, lezioni e presenze tramite qrcode, con database SQLite.

```mermaid
erDiagram
    CLASSI {
        int id PK
        string nome
    }

    STUDENTI {
        string matricola PK
        int classe_id PK, FK
        string nome
        string cognome
    }

    LEZIONI {
        int id PK
        int classe_id FK
        string data
    }

    PRESENZE {
        int lezione_id PK, FK
        string matricola PK, FK
        int classe_id PK, FK
        int presente
    }

    TOKENS {
        string token PK
        int lezione_id FK
        string data_creazione
    }

    IP_ADDRESS {
        int id PK
        int lezione_id FK
        string ip 
    }

    CLASSI ||--o{ STUDENTI : contiene
    CLASSI ||--o{ LEZIONI : tiene
    LEZIONI ||--o{ PRESENZE : registra
    STUDENTI ||--o{ PRESENZE : partecipa
    LEZIONI ||--o| TOKENS : ha
    LEZIONI ||--o{ IP_ADDRESS : registra
```
