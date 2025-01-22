#!/bin/env node

import { Octokit } from '@octokit/rest';
import { config } from 'dotenv';

// Load environment variables
config();
const GITHUB_HOST = process.env.GITHUB_HOST || 'github.dev';
const token = process.env.GITHUB_TOKEN;

// Construct the base URL for the enterprise instance
const baseUrl = `https://${GITHUB_HOST}/api/v3`;

if (!token) {
  console.error("Please set the GITHUB_TOKEN environment variable.");
  process.exit(1);
}

const octokit = new Octokit({
  auth: token,
  baseUrl,
});

// Global organization variable (set dynamically)
let org;

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0];
const verbose = args.includes('-verbose');
let count;
if (command === 'gen') {
  count = parseInt(args[2], 10);
}

// Helper function to display lists based on verbosity
function displayList(label, items, keyName) {
  if (verbose) {
    console.log(label, JSON.stringify(items, null, 2));
  } else {
    console.log(`${label}:`);
    items.forEach(item => {
      console.log(item[keyName]);
    });
  }
}

// --- Get Functions: Return data silently without display ---

async function getAllUsersGlobal() {
  return await octokit.paginate(octokit.request.endpoint("GET /users"), {});
}

async function getAllReposGlobal() {
  let allRepos = [];
  const userRepos = await octokit.paginate(octokit.request.endpoint("GET /repositories"), {});
  allRepos = allRepos.concat(userRepos);
  const orgs = await getAllOrganizations();
  for (const org of orgs) {
    const orgRepos = await octokit.paginate(octokit.request.endpoint(`GET /orgs/${org.login}/repos`), {});
    allRepos = allRepos.concat(orgRepos);
  }
  return allRepos;
}

async function getAllOrganizations() {
  return await octokit.paginate(octokit.request.endpoint("GET /organizations"), {});
}

async function getAllTeamsGlobal() {
  const organizations = await getAllOrganizations();
  let allTeams = [];
  for (const organization of organizations) {
    try {
      const teams = await octokit.paginate(octokit.rest.teams.list, { org: organization.login });
      allTeams = allTeams.concat(teams);
    } catch (err) {
      console.warn(`Could not list teams for organization ${organization.login}: ${err.message}`);
    }
  }
  return allTeams;
}

async function getAllProjectsGlobal() {
  const organizations = await getAllOrganizations();
  let allProjects = [];
  for (const organization of organizations) {
    try {
      const projects = await octokit.paginate(octokit.rest.projects.listForOrg, { org: organization.login });
      allProjects = allProjects.concat(projects);
    } catch (err) {
      console.warn(`Could not list projects for organization ${organization.login}: ${err.message}`);
    }
  }
  return allProjects;
}

// --- New Function: Get all issues from all organizations and users ---
async function getAllIssuesGlobal() {
  const repos = await getAllReposGlobal();
  let allIssues = [];
  for (const repo of repos) {
    try {
      const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
        owner: repo.owner.login,
        repo: repo.name,
        state: 'all'
      });
      allIssues = allIssues.concat(issues);
    } catch (err) {
      console.warn(`Could not list issues for repository ${repo.full_name}: ${err.message}`);
    }
  }
  return allIssues;
}

// --- List Functions: Call get functions and display results ---

async function listAllUsersGlobal() {
  const users = await getAllUsersGlobal();
  displayList("Global Users", users, 'login');
  return users;
}

async function listAllReposGlobal() {
  const repos = await getAllReposGlobal();
  displayList("Global Repositories", repos, 'html_url');
  return repos;
}

async function listAllOrganizations() {
  const organizations = await getAllOrganizations();
  displayList("Global Organizations", organizations, 'login');
  return organizations;
}

async function listAllTeamsGlobal() {
  const teams = await getAllTeamsGlobal();
  displayList("All Teams Across Organizations", teams, 'html_url');
  return teams;
}

async function listAllProjectsGlobal() {
  const projects = await getAllProjectsGlobal();
  displayList("All Projects Across Organizations", projects, 'html_url');
  return projects;
}

// --- New List Function: List all issues globally ---
async function listAllIssuesGlobal() {
  const issues = await getAllIssuesGlobal();
  displayList("All Issues Across Organizations and User Repositories", issues, 'html_url');
  return issues;
}

// --- New Function: Get a random organization name ---
async function getRandomOrgName() {
  const organizations = await getAllOrganizations();
  if (!organizations.length) {
    throw new Error('No organizations found');
  }
  const randomIndex = Math.floor(Math.random() * organizations.length);
  return organizations[randomIndex].login;
}

// --- Generator Functions ---

async function generateUsers(count) {
  console.log(`Simulating generation of ${count} users (not supported by API).`);
}

async function generateOrganisations(count) {
  console.log(`Simulating generation of ${count} organizations (not supported by API).`);
}

async function generateProjects(count) {
  for (let i = 0; i < count; i++) {
    const projectName = `project-${Date.now()}-${i}`;
    try {
      await octokit.rest.projects.createForOrg({
        org,
        name: projectName,
        body: 'Automatically generated project.'
      });
      console.log(`Created project: ${projectName}`);
    } catch (err) {
      console.error(`Failed to create project ${projectName}: ${err.message}`);
    }
  }
}

async function generateRepos(count) {
  for (let i = 0; i < count; i++) {
    const repoName = `repo-${Date.now()}-${i}`;
    try {
      const repo = await octokit.rest.repos.createInOrg({
        org,
        name: repoName,
        description: 'Created by script',
        private: true,
      });
      console.log(`Created repository: ${repo.data.name} - ${repo.data.html_url}`);
    } catch (err) {
      console.error(`Failed to create repository ${repoName}: ${err.message}`);
    }
  }
}

async function generateTeams(count) {
  for (let i = 0; i < count; i++) {
    const teamName = `team-${Date.now()}-${i}`;
    try {
      const team = await octokit.rest.teams.create({
        org,
        name: teamName,
        privacy: 'closed',
      });
      console.log(`Created team: ${team.data.name} - ${team.data.html_url}`);
    } catch (err) {
      console.error(`Failed to create team ${teamName}: ${err.message}`);
    }
  }
}

// --- New Generator Function: Generate issues ---
async function generateIssues(count) {
  const repos = await getAllReposGlobal();
  if (!repos.length) {
    throw new Error('No repositories found to create issues in.');
  }

  for (let i = 0; i < count; i++) {
    const randomRepo = repos[Math.floor(Math.random() * repos.length)];
    const issueTitle = `Issue ${Date.now()}-${i}`;
    try {
      const issue = await octokit.rest.issues.create({
        owner: randomRepo.owner.login,
        repo: randomRepo.name,
        title: issueTitle,
        body: 'This is an automatically generated issue.'
      });
      console.log(`Created issue: ${issue.data.title} - ${issue.data.html_url}`);
    } catch (err) {
      console.error(`Failed to create issue ${issueTitle} in ${randomRepo.full_name}: ${err.message}`);
    }
  }
}

// --- Command-Line Interface Execution ---

(async () => {
  try {
    // Set global organization variable: use ORG_NAME env variable or get a random org
    org = process.env.ORG_NAME || await getRandomOrgName();

    console.log("random picked org "+org)

    if (command === 'gen' && args[1] === 'users') await generateUsers(count);
    else if (command === 'gen' && args[1] === 'orgs') await generateOrganisations(count);
    else if (command === 'gen' && args[1] === 'projects') await generateProjects(count);
    else if (command === 'gen' && args[1] === 'repos') await generateRepos(count);
    else if (command === 'gen' && args[1] === 'teams') await generateTeams(count);
    else if (command === 'gen' && args[1] === 'issues') await generateIssues(count);
    else if (command === 'list' && args[1] === 'users') await listAllUsersGlobal();
    else if (command === 'list' && args[1] === 'repos') await listAllReposGlobal();
    else if (command === 'list' && args[1] === 'orgs') await listAllOrganizations();
    else if (command === 'list' && args[1] === 'teams') await listAllTeamsGlobal();
    else if (command === 'list' && args[1] === 'projects') await listAllProjectsGlobal();
    else if (command === 'list' && args[1] === 'issues') await listAllIssuesGlobal();
    else console.log('Invalid command or arguments.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
