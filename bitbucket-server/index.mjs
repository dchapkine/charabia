#!/bin/env node

// https://developer.atlassian.com/server/bitbucket/rest/v905

// Import required modules
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import OpenAI from 'openai';
import simpleGit from 'simple-git';

// Load environment variables
config();
const BB_HOST = process.env.BB_HOST || 'localhost:7991';
const BB_ADMIN_USERNAME = process.env.BB_ADMIN_USERNAME;
const BB_ADMIN_PASSWORD = process.env.BB_ADMIN_PASSWORD;
const BB_ADMIN_TOKEN = process.env.BB_ADMIN_TOKEN;
const OPENAI_API_TOKEN = process.env.OPENAI_API_TOKEN;

if (!BB_ADMIN_PASSWORD || !BB_ADMIN_USERNAME || !OPENAI_API_TOKEN) {
    throw new Error('Missing BB_ADMIN_PASSWORD or BB_ADMIN_USERNAME or OPENAI_API_TOKEN in environment variables.');
}

const BASE_URL = `https://${BB_HOST}/rest/api/1.0`;
const openai = new OpenAI({ apiKey: OPENAI_API_TOKEN });
const git = simpleGit();

// Helper functions
async function apiRequest(method, endpoint, query, body) {
    
    let qs = "";
    if (query) {
        qs = "?" + new URLSearchParams(query).toString()
    }

    const encodedCreds = Buffer.from(`${BB_ADMIN_USERNAME}:${BB_ADMIN_PASSWORD}`).toString('base64');

    let obj = {
        method,
        headers: {
            'Content-Type': 'application/json',
            // unfortunately token don't have all the global permissions of the admin so we have to use login/password
            // https://jira.atlassian.com/browse/BSERV-12791
            //'Authorization': `Bearer ${BB_ADMIN_TOKEN}`
            'Authorization': `Basic ${encodedCreds}`
        }
    };

    if (body) {
        obj.body = JSON.stringify(body);
    }

    const url = `${BASE_URL}${endpoint}${qs}`;
    const response = await fetch(url, obj);

    if (!response.ok) {
        //console.error(response);
        throw new Error(`API request failed: ${response.statusText}`);
    }

    const res = await response.text();
    try {
        return JSON.parse(res);
    } catch (ex) {
        return res || null;
    }
}

const generatePassword = (length, chars) => {
    chars = chars || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_-=+"
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

async function generateRandom(prompt, maxTokens = 10) {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    });
    return response.choices[0].message.content.trim();
}

// Command handlers
async function generateUsers(count) {
    let users = [];

    try {
        users = JSON.parse(await fs.readFile('users.json', 'utf-8'));
    } catch (err) {}

    for (let i = 0; i < count; i++) {
        const username = await generateRandom('Generate a unique lowercase alpahnumeric username ' + Math.random());
        const email = `${username}@example.com`;
        const password = generatePassword(10)

        console.log(`creating user: ${username} ${email} ${password}`)
        await apiRequest('POST', '/admin/users', {
            displayName: username,
            name: username,
            emailAddress: email,
            password,
            notify: false
        }, null);

        users.push({ username, email, password });
    }

    await fs.writeFile('users.json', JSON.stringify(users, null, 2));
    console.log(`${count} users created.`);
}

async function generateGroups(count) {

    let users = [];
    let groups = [];

    try {
        users = JSON.parse(await fs.readFile('users.json', 'utf-8'));
    } catch (err) {}
    
    try {
        groups = JSON.parse(await fs.readFile('groups.json', 'utf-8'));
    } catch (err) {}
    

    for (let i = 0; i < count; i++) {
        const groupName = await generateRandom(`Generate a unique group name tha makes you think about ${Math.random()}`);

        console.log(`Creating ${groupName}`);
        try {
            await apiRequest('POST', '/admin/groups', { name: groupName }, null);

            const groupUsers = users
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(5, users.length))
                .map(user => user.username);

            await apiRequest('POST', `/admin/groups/add-users`, null, { group: groupName, users: groupUsers });

            groups.push({ groupName, members: groupUsers });    
            console.log(`  +success`);
        } catch (err) {
            console.log(`  +fail`);
        }
        
    }

    await fs.writeFile('groups.json', JSON.stringify(groups, null, 2));
    console.log(`${count} groups created.`);
}

/**
 * 
 * @doc https://developer.atlassian.com/server/bitbucket/rest/v905/api-group-project/#api-api-latest-projects-post
 */
async function generateProjects(count) {

    let users = [];
    let groups = [];
    let projects = [];

    try {
        users = JSON.parse(await fs.readFile('users.json', 'utf-8'));
    } catch (err) {}
    
    try {
        groups = JSON.parse(await fs.readFile('groups.json', 'utf-8'));
    } catch (err) {}

    try {
        projects = JSON.parse(await fs.readFile('projects.json', 'utf-8'));
    } catch (err) {}

    for (let i = 0; i < count; i++) {
        const projectKey = await generateRandom('Generate a unique alphanumeric project key ' + Math.random());

        console.log(`creating project ${projectKey}`)
        const project = await apiRequest('POST', '/projects', null, { key: projectKey });

        const projectUsers = users
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * users.length) + 1)
            .map(u => u.username)

        // https://developer.atlassian.com/server/bitbucket/rest/v905/api-group-project/#api-api-latest-projects-projectkey-permissions-users-put
        for (const user of projectUsers) {
            console.log(`assigning users to project ${projectKey}: ${user}`);
            await apiRequest('PUT', `/projects/${project.key}/permissions/users`, {
                name: user,
                permission: 'PROJECT_WRITE'
                //permission: ['PROJECT_READ', 'PROJECT_WRITE', 'PROJECT_ADMIN'][Math.floor(Math.random() * 3)]
            }, null);
        }

        const projectGroups = groups
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * groups.length) + 1)
            .map(g => g.groupName)

        // https://developer.atlassian.com/server/bitbucket/rest/v905/api-group-project/#api-api-latest-projects-projectkey-permissions-groups-put
        /*for (const group of projectGroups) {
            console.log(`assigning groups to project ${projectKey}: ${group}`);
            await apiRequest('PUT', `/projects/${project.key}/permissions/groups`, null, {
                name: group,
                permission: 'PROJECT_WRITE'
                //permission: ['PROJECT_READ', 'PROJECT_WRITE', 'PROJECT_ADMIN'][Math.floor(Math.random() * 3)]
            });
        }
        */

        projects.push({ projectKey, users: projectUsers, groups: []/*projectGroups*/ });
    }

    await fs.writeFile('projects.json', JSON.stringify(projects, null, 2));
    console.log(`${count} projects created.`);
}

async function generateRepos(count) {
    let users = [];
    let projects = [];
    let repos = [];

    try {
        users = JSON.parse(await fs.readFile('users.json', 'utf-8'));
    } catch (err) {}

    try {
        projects = JSON.parse(await fs.readFile('projects.json', 'utf-8'));
    } catch (err) {}
    
    try {
        repos = JSON.parse(await fs.readFile('repos.json', 'utf-8'));
    } catch (err) {}

    for (let i = 0; i < count; i++) {
        const repoName = await generateRandom('Generate a unique repository name ' + Math.random());
        const project = projects[Math.floor(Math.random() * projects.length)];

        console.log(`creating repository ${repoName} in project ${project.projectKey}`)
        const repo = await apiRequest('POST', `/projects/${project.projectKey}/repos`, null, { name: repoName });

        /*const repoUsers = users
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * users.length) + 1);

        for (const user of repoUsers) {
            console.log(`updating repository ${repoName} permission for user ${user.username}`)
            await apiRequest('PUT', `/projects/${project.projectKey}/repos/${repo.slug}/permissions/users`, null, {
                user: user.username,
                permission: 'REPO_WRITE'
                //permission: ['REPO_READ', 'REPO_WRITE', 'REPO_ADMIN'][Math.floor(Math.random() * 3)]
            });
        }*/

        repos.push({ repoName, project: project.projectKey, users: []/*repoUsers*/ });
    }

    await fs.writeFile('repos.json', JSON.stringify(repos, null, 2));
    console.log(`${count} repositories created.`);
}

async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms || 1000)
    });
}




async function addCommitsToRepos(commitCount) {
    let repos = [];
    try {
        repos = JSON.parse(await fs.readFile('repos.json', 'utf-8'));
    } catch (err) {
        console.error('Error reading repos.json:', err);
        return;
    }

    let commitsAdded = 0;

    while (commitsAdded < commitCount) {
        const randomRepo = repos[Math.floor(Math.random() * repos.length)];
    
        const projectKey = randomRepo.project;
        const repoSlug = randomRepo.repoName;

        const cloneUrl = `https://${encodeURIComponent(BB_ADMIN_USERNAME)}:${encodeURIComponent(BB_ADMIN_PASSWORD)}@${BB_HOST}/scm/${projectKey}/${repoSlug}.git`;
        const localRepoPath = `/tmp/charabia_repo_${Date.now()}_${~~(Math.random()*100000000000)}`;

        console.log("");
        console.log(`Cloning repository ${repoSlug} into ${localRepoPath}...`);

        try {
            // Clone the repository
            await git.clone(cloneUrl, localRepoPath);

            // Initialize Git operations in the cloned repo
            const repoGit = simpleGit(localRepoPath);

            // Fetch all remote branches
            console.log(`Fetching updates for ${repoSlug} into ${localRepoPath}...`);
            await repoGit.fetch();

            // Get the default branch or handle an empty repository
            const remoteBranches = await repoGit.branch(['-r']);
            const defaultBranch = remoteBranches.all.find(branch => branch.includes('HEAD'))?.replace('origin/HEAD -> origin/', '') || 'main';

            // Check for remote branch existence
            const branchExists = remoteBranches.all.includes(`origin/${defaultBranch}`);
            if (branchExists) {
                console.log(`Checking out and rebasing default branch: ${defaultBranch}`);
                await repoGit.checkout(defaultBranch);
                await repoGit.pull('origin', defaultBranch, { '--rebase': true });
            } else {
                console.log(`No branches found, initializing repository with branch: ${defaultBranch}`);
                await repoGit.checkoutLocalBranch(defaultBranch);
                const readmePath = `${localRepoPath}/README.md`;
                await fs.writeFile(readmePath, `# ${repoSlug}\n\nInitialized repository.`);
                await repoGit.add(readmePath);
                await repoGit.commit('Initial commit');
                console.log(`Pushing initial commit to ${defaultBranch}...`);
                await repoGit.push(['--set-upstream', 'origin', defaultBranch]);
            }

            // Add a new file and commit
            const maxToAddLocally = Math.floor(Math.random() * 5)+5;
            let locallyAddedCommits = 0;
            console.log(`Adding UP to ${maxToAddLocally} commits to ${repoSlug} into ${localRepoPath}...`);
            while (commitsAdded < commitCount && locallyAddedCommits < maxToAddLocally) {
                const filePath = `${localRepoPath}/file_${Math.random().toString(36).substring(7)}.txt`;
                const fileContent = `This is an automated commit.`;
                await fs.writeFile(filePath, fileContent);
                await repoGit.add(filePath);
                await repoGit.commit(`Automated commit ${filePath}`);
                console.log(`  + Automated commit ${filePath}`);
                commitsAdded++;
                locallyAddedCommits++;
            }

            // Push changes to remote
            console.log(`Pushing commit to ${repoSlug} into ${localRepoPath}...`);
            await repoGit.push('origin', defaultBranch);

            console.log(`  + Commit added and pushed to ${repoSlug}`);

            // Cleanup local repository
            await fs.rm(localRepoPath, { recursive: true, force: true });
        } catch (err) {
            console.error(`  + Failed to add commit to ${repoSlug}: ${err.message}`);
        }
    }

    console.log(`${commitCount} commits added.`);
}

async function checkAndSetDefaultBranch() {
    let repos = [];
    try {
        repos = JSON.parse(await fs.readFile('repos.json', 'utf-8'));
    } catch (err) {
        console.error('Error reading repos.json:', err);
        return;
    }

    for (const repo of repos) {
        const { project: projectKey, repoName: repoSlug } = repo;

        try {
            //console.log(`Checking default branch for repository: ${repoSlug}...`);

            // Get repository details
            const repoDetails = await apiRequest('GET', `/projects/${projectKey}/repos/${repoSlug}`);

            // Check if default branch exists
            if (repoDetails.defaultBranch) {
                //console.log(`Default branch already set to: ${repoDetails.defaultBranch.displayId}`);
                continue;
            }

            // Set default branch to 'main'
            console.log(`No default branch found. Setting default branch to 'main' for repository: ${repoSlug}...`);

            const body = { id: 'refs/heads/main' };
            await apiRequest('PUT', `/projects/${projectKey}/repos/${repoSlug}/branches/default`, null, body);

            //console.log(`Default branch set to 'main' for repository: ${repoSlug}.`);
        } catch (err) {
            console.error(`Failed to check or set default branch for repository '${repoSlug}': ${err.message}`);
        }
    }
}

async function generatePullRequests(count) {
    let repos = [];
    try {
        repos = JSON.parse(await fs.readFile('repos.json', 'utf-8'));
    } catch (err) {
        console.error('Error reading repos.json:', err);
        return;
    }

    let i = 0;
    while (i < count) {
        let j = 0;
        const localPRsMax = Math.floor(Math.random() * 30)+10;

        const randomRepo = repos[Math.floor(Math.random() * repos.length)];
        const { project: projectKey, repoName: repoSlug } = randomRepo;
        const cloneUrl = `https://${encodeURIComponent(BB_ADMIN_USERNAME)}:${encodeURIComponent(BB_ADMIN_PASSWORD)}@${BB_HOST}/scm/${projectKey}/${repoSlug}.git`;

        while (i < count && j < localPRsMax) {

            const localRepoPath = `/tmp/charabia_pullrequest_repo_${Date.now()}_${Math.random().toString(36).substring(2)}`;

            console.log(`Processing repository ${repoSlug} for pull request...`);

            try {
                // Clone the repository
                await git.clone(cloneUrl, localRepoPath);

                const repoGit = simpleGit(localRepoPath);

                // Fetch updates and determine default branch
                console.log(`Fetching updates for ${repoSlug}...`);
                await repoGit.fetch();
                let defaultBranch = 'main';
                try {
                    const remoteBranches = await repoGit.branch(['-r']);
                    defaultBranch = remoteBranches.all.find(branch => branch.includes('HEAD'))
                        ?.replace('origin/HEAD -> origin/', '') || 'main';
                } catch (e) {
                    console.warn('Could not determine default branch, using "main"');
                }

                // Checkout default branch and pull latest changes
                await repoGit.checkout(defaultBranch);
                await repoGit.pull('origin', defaultBranch, { '--rebase': true });

                // Create a new branch
                const newBranchName = `feature/${await generateRandom('Generate a unique branch name ' + Math.random(), 5)}`;
                console.log(`Creating new branch: ${newBranchName}`);
                await repoGit.checkoutLocalBranch(newBranchName);

                // Add a random commit
                const filePath = `${localRepoPath}/file_${Math.random().toString(36).substring(7)}.txt`;
                const fileContent = `This is an automated commit for pull request.`;
                await fs.writeFile(filePath, fileContent);
                await repoGit.add(filePath);
                await repoGit.commit('Automated commit for pull request');

                // Push the new branch
                console.log(`Pushing branch ${newBranchName}...`);
                await repoGit.push(['--set-upstream', 'origin', newBranchName]);

                // Open a pull request via API
                const prBody = {
                    title: `Automated PR from ${newBranchName}`,
                    description: `This PR was automatically created from branch ${newBranchName}.`,
                    state: "OPEN",
                    open: true,
                    closed: false,
                    fromRef: {
                        id: `refs/heads/${newBranchName}`,
                        repository: {
                            slug: repoSlug,
                            project: { key: projectKey }
                        }
                    },
                    toRef: {
                        id: `refs/heads/main`,
                        repository: {
                            slug: repoSlug,
                            project: { key: projectKey }
                        }
                    },
                    locked: false,
                    reviewers: []
                };

                const prResponse = await apiRequest('POST', `/projects/${projectKey}/repos/${repoSlug}/pull-requests`, null, prBody);
                console.log(`Pull request created for ${repoSlug}:`, prResponse.title);

                // Cleanup local repository
                await fs.rm(localRepoPath, { recursive: true, force: true });
            } catch (err) {
                console.error(`Error processing repository ${repoSlug}: ${err.message}`);
            }

            i++;
            j++;
            console.log(`${i} PRs created so far`);
            console.log("");
        }

    }
}


// Main
const args = process.argv.slice(2);
const command = args[0];
const count = parseInt(args[2], 10);

(async () => {
    try {
        if (command === 'gen' && args[1] === 'users') await generateUsers(count);
        else if (command === 'gen' && args[1] === 'groups') await generateGroups(count);
        else if (command === 'gen' && args[1] === 'projects') await generateProjects(count);
        else if (command === 'gen' && args[1] === 'repos') await generateRepos(count);
        else if (command === 'gen' && args[1] === 'commits') await addCommitsToRepos(count);
        else if (command === 'gen' && args[1] === 'pullrequests') await generatePullRequests(count);
        else if (command === 'fix' && args[1] === 'default-branch') await checkAndSetDefaultBranch();
        else console.log('Invalid command or arguments.');
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
