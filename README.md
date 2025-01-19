# charabia

Massive AI data generator to populate various open source applications with test data for development and testing purposes

WARNING: EXPERIMENTAL PROJECT, USE AT YOUR OWN RISK

# Bitbucket Server

Install

```
cd bitbucket-server
npm install
```

Configure `.env`

```
BB_HOST=localhost:7991
BB_ADMIN_USERNAME=...
BB_ADMIN_PASSWORD=...
OPENAI_API_TOKEN=...

```

**Note that most /admin apis won't be allowed using a token, hence the login/password usage instead...**


Generate local X users

```
./index.mjs gen users X
```

Generate X local groups and assign random existing  users to it

```
./index.mjs gen groups X
```

Generate X local projects and assign random existing users to it

```
./index.mjs gen projects X
```

Generate X local repos and assign to random project

```
./index.mjs gen repos X
```

Dispatches up to X commits randomly acroll all existing repositories (into default branch), using batches of 5-10 random commits per repo.

```
./index.mjs gen commits X
```

Fix default branches

```
./index.mjs fix default-branch
```
