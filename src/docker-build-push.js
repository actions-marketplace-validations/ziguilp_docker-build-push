/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-16 10:07:03
 * @FilePath      : /docker-build-push/src/docker-build-push.js
 * @Description   : forked from mr-smithers-excellent/docker-build-push
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */
const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');
const { parseArray } = require('./utils');

const buildOpts = {
    tags: undefined,
    buildArgs: undefined,
    labels: undefined,
    target: undefined,
    buildDir: undefined,
    enableBuildKit: false,
    platform: undefined,
    skipPush: false
};

const run = async () => {
    try {
        // Capture action inputs
        const image = core.getInput('image', { required: true });
        const registry = core.getInput('registry', { required: true });
        const username = core.getInput('username');
        const password = core.getInput('password');
        const dockerfile = core.getInput('dockerfile');
        const githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
        const addLatest = core.getInput('addLatest') === 'true';
        const addTimestamp = core.getInput('addTimestamp') === 'true';
        const maxRetryAttempts = core.getInput('maxRetryAttempts') || 0;
        let retryDelaySeconds = core.getInput('retryDelaySeconds') || 0;
        retryDelaySeconds = retryDelaySeconds >= 0 ? retryDelaySeconds : 0;

        buildOpts.tags = parseArray(core.getInput('tags')) || docker.createTags(addLatest, addTimestamp);
        buildOpts.buildArgs = parseArray(core.getInput('buildArgs'));
        buildOpts.labels = parseArray(core.getInput('labels'));
        buildOpts.target = core.getInput('target');
        buildOpts.buildDir = core.getInput('directory') || '.';
        buildOpts.enableBuildKit = core.getInput('enableBuildKit') === 'true';
        buildOpts.platform = core.getInput('platform');
        buildOpts.skipPush = core.getInput('pushImage') === 'false';

        // Create the Docker image name
        const imageFullName = docker.createFullImageName(registry, image, githubOwner);
        core.info(`Docker image name used for this build: ${imageFullName}`);

        // Log in, build & push the Docker image
        await docker.login(username, password, registry, buildOpts.skipPush, maxRetryAttempts, retryDelaySeconds);
        await docker.build(imageFullName, dockerfile, buildOpts);
        await docker.push(imageFullName, buildOpts.tags, buildOpts.skipPush, maxRetryAttempts, retryDelaySeconds);

        // Capture outputs
        core.setOutput('imageFullName', imageFullName);
        core.setOutput('imageName', image);
        core.setOutput('tags', buildOpts.tags.join(','));
    } catch (error) {
        core.setFailed(error.message);
    }
};

module.exports = run;
