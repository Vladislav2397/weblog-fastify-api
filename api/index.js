"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const env_1 = __importDefault(require("@fastify/env"));
const client_1 = require("@notionhq/client");
const toCamelCase_1 = require("./utils/toCamelCase");
const schema = {
    type: 'object',
    required: ['PORT'],
    properties: {
        PORT: {
            type: 'string',
            default: 3000,
        },
    },
};
const options = { schema, dotenv: true };
let notion;
const getEnv = () => {
    return process.env;
};
const server = (0, fastify_1.default)();
server.register(env_1.default, options).ready(error => {
    if (error) {
        console.error(error);
    }
    const { NOTION_API_SECRET, PORT } = getEnv();
    if (!NOTION_API_SECRET) {
        throw new Error('Env variables is not defined');
    }
    notion = new client_1.Client({ auth: NOTION_API_SECRET });
    server.listen({ port: PORT ? +PORT : 8000 /* , host: '0.0.0.0' */ }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address}`);
    });
});
function lowercase(value) {
    return value.toLowerCase();
}
function getValueByBlockType(block) {
    switch (block.type) {
        case 'created_time':
            return block.created_time;
        case 'unique_id':
            return block.unique_id.number;
        case 'title':
            return block.title[0]?.text.content;
        case 'files':
            return block.files[0].file.url;
        case 'email':
            return block.email;
        case 'relation':
            return block.relation[0].id;
        case 'rich_text':
            return block.rich_text[0].text.content;
        case 'select':
            return block.select.name;
        default:
            return block;
    }
}
const normalizeBlockName = (name) => (0, toCamelCase_1.toCamelCase)(lowercase(name));
function getNotionDatabaseEntity(mapNames, response) {
    const fieldNames = Object.keys(mapNames);
    const items = [];
    response.results.forEach(dbRow => {
        if ('properties' in dbRow) {
            const { id, properties } = dbRow;
            const item = Object.entries(properties).reduce((total, [name, block]) => {
                if (!fieldNames.includes(name))
                    return total;
                const key = mapNames[name];
                const value = getValueByBlockType(block);
                return {
                    ...total,
                    [key]: value,
                };
            }, {});
            items.push({ id, ...item });
        }
    });
    return items;
}
async function getArticles() {
    try {
        const { NOTION_ARTICLES_DATABASE_ID } = getEnv();
        const response = await notion.databases.query({
            database_id: NOTION_ARTICLES_DATABASE_ID,
            sorts: [
                {
                    direction: 'ascending',
                    property: 'ID',
                },
            ],
        });
        return getNotionDatabaseEntity({
            Title: 'title',
            Preview: 'preview',
            'Created time': 'createdTime',
            Author: 'authorId',
        }, response);
    }
    catch (error) {
        console.error(error.body);
    }
}
async function getUsers() {
    const { NOTION_USERS_DATABASE_ID } = getEnv();
    const response = await notion.databases.query({
        database_id: NOTION_USERS_DATABASE_ID,
    });
    return getNotionDatabaseEntity({
        Name: 'name',
        Role: 'role',
        Email: 'email',
        Password: 'password',
    }, response);
}
server.get('/api/articles', async (request, reply) => {
    const articles = await getArticles();
    const users = await getUsers();
    const json = { articles, users };
    return reply.code(200).type('application/json').send(json);
});
server.get('/api/users', async (request, reply) => {
    const users = await getUsers();
    const json = { users };
    return reply.code(200).type('application/json').send(json);
});
server.get('/api', async (request, reply) => {
    return reply.code(200).type('application/json').send({
        application: 'worked',
    });
});
exports.default = async (req, res) => {
    await server.ready();
    server.server.emit('request', req, res);
};
