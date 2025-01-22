# charabia

Massive AI data generator to populate various open source applications with test data for development and testing purposes

WARNING: EXPERIMENTAL PROJECT, WORK IN PROGRESS, USE AT YOUR OWN RISK

# Use custom CA

I assume your CA is already globally installed

I assume you use ubuntu, otherwise the bndle path may be different

export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Github Entreprise Server

Install

```
cd github-entreprise
npm install
```

Configure `.env`

```
GITHUB_HOST=github.dev
GITHUB_TOKEN=....

```

List all users

```
ghes.sh list users

Global Users:
ghost
github-enterprise
github-advanced-security[bot]
github-project-automation[bot]
github-merge-queue[bot]
admin2
test
test2
automative
space
software
consulting
orange
red
cybersec
```

List all repos (in all organisations)

```
./ghes.sh list repos

Global Repositories:
https://github.dev/admin2/test
https://github.dev/software/repo-1737527328788-0
https://github.dev/software/repo-1737527912222-0
https://github.dev/orange/repo-1737505923831-0
https://github.dev/orange/repo-1737505924712-1
https://github.dev/orange/repo-1737505925320-2
https://github.dev/orange/repo-1737505925993-3
https://github.dev/orange/repo-1737505926730-4
https://github.dev/orange/repo-1737505927637-5

```

List all organisations

```
./ghes.sh list orgs

Global Organizations:
test
test2
automative
space
software
consulting
orange
red
cybersec
```

List all teams

```
./ghes.sh list teams

All Teams Across Organizations:
https://github.dev/orgs/automative/teams/team-1737527990835-0
https://github.dev/orgs/automative/teams/team-1737527991307-1
https://github.dev/orgs/automative/teams/team-1737582980940-0
https://github.dev/orgs/automative/teams/team-1737582981374-1
https://github.dev/orgs/space/teams/team-1737582985950-0
https://github.dev/orgs/space/teams/team-1737582986387-1
https://github.dev/orgs/software/teams/team-1737528017809-0
https://github.dev/orgs/software/teams/team-1737528018221-1
https://github.dev/orgs/orange/teams/team-1737582983406-0
https://github.dev/orgs/orange/teams/team-1737582983812-1

```

List all projects

```
./ghes.sh list projects

All Projects Across Organizations:
https://github.dev/orgs/space/projects/1
https://github.dev/orgs/space/projects/2
https://github.dev/orgs/space/projects/3
https://github.dev/orgs/software/projects/8
https://github.dev/orgs/software/projects/9
https://github.dev/orgs/software/projects/10
https://github.dev/orgs/red/projects/1
https://github.dev/orgs/red/projects/2
https://github.dev/orgs/red/projects/5
https://github.dev/orgs/red/projects/6
```


Generate users

```
Can't be done via API: not supported by API
```

Generate organisations

```
Can't be done via API: not supported by API
```

Generate X projects in a random organisation

```
./ghes.sh gen projects 3

random picked org cybersec
Created project: project-1737585319533-0
Created project: project-1737585319913-1
Created project: project-1737585320273-2
```

Generate X repos in a random organisation

```
./ghes.sh gen repos 3

random picked org space
Created repository: repo-1737585520371-0 - https://github.dev/space/repo-1737585520371-0
Created repository: repo-1737585521012-1 - https://github.dev/space/repo-1737585521012-1
Created repository: repo-1737585521771-2 - https://github.dev/space/repo-1737585521771-2
```

Generate X teams in a random organisation

```
./ghes.sh gen teams 3
random picked org test2
Created team: team-1737585515052-0 - https://github.dev/orgs/test2/teams/team-1737585515052-0
Created team: team-1737585515514-1 - https://github.dev/orgs/test2/teams/team-1737585515514-1
Created team: team-1737585515833-2 - https://github.dev/orgs/test2/teams/team-1737585515833-2
```



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
./bbs.sh gen users X
```

Generate X local groups and assign random existing  users to it

```
./bbs.sh gen groups X
```

Generate X local projects and assign random existing users to it

```
./bbs.sh gen projects X
```

Generate X local repos and assign to random project

```
./bbs.sh gen repos X
```

Dispatches up to X commits randomly acroll all existing repositories (into default branch), using batches of 5-10 random commits per repo.

```
./bbs.sh gen commits X
```

Creates batches of random pull requests on randomly picked existing repositories, until it reaches X total PRs

```
./bbs.sh gen pullrequests X
```

Fix default branches

```
./bbs.sh fix default-branch
```
