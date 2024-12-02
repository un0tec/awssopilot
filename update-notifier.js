import axios from 'axios';

async function fetchLatestRelease(pkg) {
    const url = `https://api.github.com/repos/${pkg.author}/${pkg.repository}/releases/latest`;
    try {
        return (await axios.get(url)).data.tag_name;
    } catch (error) {
        console.warn(`Error fetching latest release. Check manually: https://github.com/${pkg.author}/${pkg.repository}/releases/latest`);
        return null;
    }
}

function logUpdate(pkg, latestVersion) {
    console.warn(`Update available ${pkg.version} -> ${latestVersion}`);
    console.warn(`Run 'npm i -g ${pkg.name}' to update`);
    console.warn(`GitHub -> https://github.com/${pkg.author}/${pkg.repository}/releases/latest`);
}

export async function checkUpdate(pkg) {
    const latestVersion = await fetchLatestRelease(pkg);
    if (latestVersion && pkg.version !== latestVersion) {
        logUpdate(pkg, latestVersion);
        return true;
    }
    return false;
}