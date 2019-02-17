const Deployer = require('ssh-deploy-release');
const { name } = require('../package.json');

const options = {
    localPath: '.',
    host: 'raspberrypi',
    username: 'pi',
    password: 'raspberry',
    deployPath: `/var/${name}`,
    onBeforeDeployExecute: ['npm install', 'npm link'],
};

const deployer = new Deployer(options);
deployer.deployRelease(() => {
    console.log('Ok !');
});
