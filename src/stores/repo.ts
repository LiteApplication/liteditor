import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useAuthStore } from "./auth";
import {
  LiteEditorConfigSchema,
  type LiteEditorConfig,
  type CarouselConfig,
  type FieldSchema,
} from "@/types/schema";
import { b64decode, b64encode } from "@/utils/encoding";
import { resolveRelativePath, computeRelativePath, adjustDocumentPaths } from "@/utils/paths";
import { parseFrontmatter, serializeFrontmatter } from "@/utils/frontmatter";

// Re-export utilities that external components import directly from this module
export { b64decode, b64encode, resolveRelativePath, computeRelativePath, adjustDocumentPaths };

export interface CarouselSlide {
  src?: string; // repo-relative image path (optional for new slides)
  alt?: string;
  caption?: string;
  [key: string]: unknown;
}

export interface CarouselData {
  images: CarouselSlide[];
  [key: string]: unknown;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  description: string | null;
}

export interface TreeNode {
  path: string;
  name: string;
  type: "file" | "dir";
  sha?: string;
  size?: number;
}

export interface StagedFile {
  path: string;
  sha: string | null;
  type: "markdown" | "settings" | "asset" | "carousel";
  content: string; // body (no frontmatter) for md, full text for settings
  originalContent: string;
  frontmatter: Record<string, unknown>; // parsed YAML frontmatter
  originalFrontmatter: Record<string, unknown>;
}

export interface StagedCarousel {
  key: string; // carousel key from .liteditor
  data: CarouselData; // parsed JSON
  originalData: CarouselData;
  sha: string | null; // sha of carousel.json
  dirty: boolean;
}

// Store
export const useRepoStore = defineStore("repo", () => {
  const auth = useAuthStore();

  const repos = ref<GitHubRepo[]>([]);
  const reposLoading = ref(false);
  const selectedRepo = ref<GitHubRepo | null>(null);
  const config = ref<LiteEditorConfig | null>(null);
  const configError = ref<string | null>(null);
  const configLoading = ref(false);
  const fileTree = ref<TreeNode[]>([]);
  const treeLoading = ref(false);
  const customFolders = ref<string[]>([]);
  const assetTree = ref<TreeNode[]>([]);
  const stagedFiles = ref<Map<string, StagedFile>>(new Map());
  const stagedDeletions = ref<Set<string>>(new Set());
  const activeFilePath = ref<string | null>(null);
  const settingsData = ref<Record<string, unknown>>({});
  const settingsSha = ref<string | null>(null);
  const settingsDirty = ref(false);

  // ─── Carousel state ──────────────────────────────────────────────────────────
  const stagedCarousels = ref<Map<string, StagedCarousel>>(new Map());
  const activeCarouselKey = ref<string | null>(null);

  // ─── GitHub Actions state ────────────────────────────────────────────────────
  const githubActionStatus = ref<"success" | "failure" | "in_progress" | null>(null);

  const hasStagedChanges = computed(() => {
    if (stagedDeletions.value.size > 0) return true;
    for (const [, f] of stagedFiles.value) {
      if (f.content !== f.originalContent) return true;
      if (JSON.stringify(f.frontmatter) !== JSON.stringify(f.originalFrontmatter)) return true;
    }
    for (const [, c] of stagedCarousels.value) {
      if (c.dirty) return true;
    }
    return settingsDirty.value;
  });

  const activeFile = computed(() =>
    activeFilePath.value ? (stagedFiles.value.get(activeFilePath.value) ?? null) : null,
  );

  const activeCarousel = computed(() =>
    activeCarouselKey.value ? (stagedCarousels.value.get(activeCarouselKey.value) ?? null) : null,
  );

  async function fetchRepos() {
    reposLoading.value = true;
    try {
      const res = await auth.githubFetch(
        "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator",
      );
      if (!res.ok) throw new Error("Failed to fetch repos");
      repos.value = (await res.json()) as GitHubRepo[];
    } finally {
      reposLoading.value = false;
    }
  }

  async function selectRepo(repo: GitHubRepo) {
    selectedRepo.value = repo;
    config.value = null;
    configError.value = null;
    fileTree.value = [];
    assetTree.value = [];
    stagedFiles.value = new Map();
    stagedCarousels.value = new Map();
    activeCarouselKey.value = null;
    activeFilePath.value = null;
    settingsData.value = {};
    settingsDirty.value = false;
    await loadConfig();
  }

  async function loadConfig() {
    if (!selectedRepo.value) return;
    configLoading.value = true;
    configError.value = null;
    fetchActionStatus();
    try {
      const { owner, name } = selectedRepo.value;
      const res = await auth.githubFetch(`/repos/${owner.login}/${name}/contents/.liteditor`);
      if (res.status === 404) {
        configError.value = "no_config";
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch .liteditor");
      const data = (await res.json()) as { content: string };
      const raw = b64decode(data.content);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = (await import("js-yaml")).load(raw);
      }

      // Validate mathematically the user configuration file
      const result = LiteEditorConfigSchema.safeParse(parsed);
      if (!result.success) {
        configError.value =
          "Config validation error: " +
          result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        return;
      }
      config.value = result.data;

      // Load workspace state from localstorage beforehand
      const wkKey = `liteditor_workspace_${selectedRepo.value!.full_name}`;
      try {
        const rawWk = localStorage.getItem(wkKey);
        if (rawWk) {
          const wk = JSON.parse(rawWk);
          stagedFiles.value = new Map(wk.stagedFiles || []);
          stagedDeletions.value = new Set(wk.stagedDeletions || []);
          customFolders.value = wk.customFolders || [];
          settingsData.value = wk.settingsData || {};
          settingsDirty.value = wk.settingsDirty || false;
          settingsSha.value = wk.settingsSha || null;
          stagedCarousels.value = new Map(wk.stagedCarousels || []);
        } else {
          customFolders.value = [];
          stagedDeletions.value.clear();
          stagedFiles.value.clear();
          stagedCarousels.value.clear();
        }
      } catch {
        customFolders.value = [];
        stagedDeletions.value.clear();
        stagedFiles.value.clear();
        stagedCarousels.value.clear();
      }

      await Promise.all([
        fetchTree(config.value.content_path),
        fetchAssets(config.value.assets_path),
        loadSettings(),
      ]);

      // Post-fetch fileTree alignment
      fileTree.value = fileTree.value.filter((f) => !stagedDeletions.value.has(f.path));
      for (const [path, sf] of stagedFiles.value) {
        if (!fileTree.value.some((f) => f.path === path)) {
          fileTree.value.push({
            path,
            name: path.split("/").pop()!.replace(/\.md$/, ""),
            type: "file",
            sha: sf.sha || "",
          });
        }
      }
    } catch (e: unknown) {
      configError.value = e instanceof Error ? e.message : "Failed to load config";
    } finally {
      configLoading.value = false;
    }
  }

  async function fetchTree(path: string) {
    if (!selectedRepo.value) return;
    treeLoading.value = true;
    try {
      const { owner, name, default_branch } = selectedRepo.value;
      const res = await auth.githubFetch(
        `/repos/${owner.login}/${name}/git/trees/${default_branch}?recursive=1`,
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        tree: Array<{ path: string; type: string; sha: string; size?: number }>;
      };
      fileTree.value = data.tree
        .filter((i) => i.path.startsWith(path + "/") && i.path.endsWith(".md") && i.type === "blob")
        .map((i) => ({
          path: i.path,
          name: i.path.split("/").pop()!.replace(/\.md$/, ""),
          type: "file" as const,
          sha: i.sha,
          size: i.size,
        }));
    } finally {
      treeLoading.value = false;
    }
  }

  async function fetchAssets(path: string) {
    if (!selectedRepo.value) return;
    const { owner, name, default_branch } = selectedRepo.value;
    const res = await auth.githubFetch(
      `/repos/${owner.login}/${name}/git/trees/${default_branch}?recursive=1`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      tree: Array<{ path: string; type: string; sha: string; size?: number }>;
    };
    const imageExts = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
    assetTree.value = data.tree
      .filter((i) => i.path.startsWith(path + "/") && i.type === "blob" && imageExts.test(i.path))
      .map((i) => ({
        path: i.path,
        name: i.path.split("/").pop() ?? i.path,
        type: "file" as const,
        sha: i.sha,
        size: i.size,
      }));
  }

  async function fetchActionStatus() {
    if (!selectedRepo.value) return;
    const { owner, name, default_branch } = selectedRepo.value;
    try {
      const res = await auth.githubFetch(
        `/repos/${owner.login}/${name}/actions/runs?branch=${default_branch}&per_page=1`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        workflow_runs: Array<{ status: string; conclusion: string }>;
      };
      if (data.workflow_runs && data.workflow_runs.length > 0) {
        const run = data.workflow_runs[0];
        if (run) {
          if (run.status === "completed") {
            githubActionStatus.value = run.conclusion === "success" ? "success" : "failure";
          } else {
            githubActionStatus.value = "in_progress";
          }
        }
      } else {
        githubActionStatus.value = null;
      }
    } catch {
      githubActionStatus.value = null;
    }
  }

  function createFile(dirPath: string, fileName: string) {
    if (!selectedRepo.value) return;
    const sanitizedName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!sanitizedName) return;
    const fullPath = `${dirPath}/${sanitizedName}.md`;

    if (fileTree.value.some((f) => f.path === fullPath)) {
      const existing = fileTree.value.find((f) => f.path === fullPath)!;
      void openFile(existing);
      return;
    }

    const newNode: TreeNode = { path: fullPath, name: sanitizedName, type: "file" };
    fileTree.value.push(newNode);
    stagedFiles.value.set(fullPath, {
      path: fullPath,
      sha: null,
      type: "markdown",
      content: "",
      originalContent: "",
      frontmatter: {},
      originalFrontmatter: {},
    });
    stagedFiles.value = new Map(stagedFiles.value);
    if (stagedDeletions.value.has(fullPath)) stagedDeletions.value.delete(fullPath);
    activeFilePath.value = fullPath;
    activeCarouselKey.value = null;
  }

  // ─── Asset Operations ────────────────────────────────────────────────────────
  function uploadAsset(fileName: string, base64Data: string) {
    if (!selectedRepo.value || !config.value?.assets_path) return;
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-_]+/g, "-");
    const fullPath = `${config.value.assets_path}/${sanitizedName}`;

    const newNode: TreeNode = { path: fullPath, name: sanitizedName, type: "file" };
    if (!assetTree.value.some((a) => a.path === fullPath)) {
      assetTree.value.push(newNode);
    }

    stagedFiles.value.set(fullPath, {
      path: fullPath,
      sha: null,
      type: "asset",
      content: base64Data,
      originalContent: "",
      frontmatter: {},
      originalFrontmatter: {},
    });
    stagedFiles.value = new Map(stagedFiles.value);
    if (stagedDeletions.value.has(fullPath)) stagedDeletions.value.delete(fullPath);
  }

  function deleteAsset(path: string) {
    stagedDeletions.value.add(path);
    stagedFiles.value.delete(path);
    assetTree.value = assetTree.value.filter((a) => a.path !== path);
    stagedFiles.value = new Map(stagedFiles.value);
  }

  async function moveAsset(oldPath: string, newPath: string) {
    if (!selectedRepo.value) return;
    if (!config.value?.assets_path) return;
    if (oldPath === newPath) return;
    if (assetTree.value.some((a) => a.path === newPath && a.path !== oldPath)) return; // prevent conflict

    const { owner, name } = selectedRepo.value;

    // 1. Rename in assetTree
    const asset = assetTree.value.find((a) => a.path === oldPath);
    if (asset) {
      asset.path = newPath;
      asset.name = newPath.split("/").pop() ?? newPath;
    }

    // 2. Ensure the moved asset is staged at the new path with its content.
    const existingAsset = stagedFiles.value.get(oldPath);
    const isNewUpload =
      existingAsset &&
      existingAsset.type === "asset" &&
      existingAsset.sha === null &&
      existingAsset.originalContent === "";
    let stagedAssetContent = existingAsset?.content ?? "";

    if (!existingAsset || existingAsset.type !== "asset") {
      const res = await auth.githubFetch(`/repos/${owner.login}/${name}/contents/${oldPath}`);
      if (!res.ok) throw new Error("Failed to fetch asset content");
      const data = (await res.json()) as { content: string };
      stagedAssetContent = data.content.replace(/\n/g, "");
    }

    if (existingAsset) stagedFiles.value.delete(oldPath);
    stagedFiles.value.set(newPath, {
      path: newPath,
      sha: null,
      type: "asset",
      content: stagedAssetContent,
      originalContent: stagedAssetContent,
      frontmatter: {},
      originalFrontmatter: {},
    });

    if (!isNewUpload) stagedDeletions.value.add(oldPath);
    else stagedDeletions.value.delete(oldPath);

    // 3. Update file contents and frontmatters
    for (const file of fileTree.value) {
      if (!stagedFiles.value.has(file.path)) {
        await openFile(file);
      }
    }

    // 4. Update file contents and frontmatters
    for (const [filePath, file] of stagedFiles.value) {
      if (file.type !== "markdown") continue;
      const { newContent, newFm } = adjustDocumentPaths(
        oldPath,
        newPath,
        file.content,
        file.frontmatter,
      );
      if (
        newContent !== file.content ||
        JSON.stringify(newFm) !== JSON.stringify(file.frontmatter)
      ) {
        stagedFiles.value.set(filePath, {
          ...file,
          content: newContent,
          frontmatter: newFm,
        });
      }
    }

    // 5. Update carousels
    for (const cKey of Object.keys(config.value.carousels ?? {})) {
      if (!stagedCarousels.value.has(cKey)) {
        await openCarousel(cKey);
      }
      const c = stagedCarousels.value.get(cKey);
      if (c && c.data.images) {
        let changed = false;
        const parsedImgs = c.data.images.map((img) => {
          if (img.src === oldPath) {
            changed = true;
            return { ...img, src: newPath };
          }
          return img;
        });
        if (changed) updateCarouselData(cKey, { ...c.data, images: parsedImgs });
      }
    }

    stagedFiles.value = new Map(stagedFiles.value);
    assetTree.value = [...assetTree.value];
  }

  async function renameAsset(oldPath: string, newName: string) {
    if (!config.value?.assets_path) return;
    const newPath = `${config.value.assets_path}/${newName}`;
    await moveAsset(oldPath, newPath);
  }

  // ─── OS-like Operations ───────────────────────────────────────────────────────
  function deleteItem(path: string, isFolder: boolean) {
    if (isFolder) {
      const files = fileTree.value.filter((f) => f.path.startsWith(path + "/"));
      files.forEach((f) => {
        stagedDeletions.value.add(f.path);
        stagedFiles.value.delete(f.path);
        if (activeFilePath.value === f.path) activeFilePath.value = null;
      });
      fileTree.value = fileTree.value.filter((f) => !f.path.startsWith(path + "/"));
      customFolders.value = customFolders.value.filter((cf) => !cf.startsWith(path));
    } else {
      stagedDeletions.value.add(path);
      stagedFiles.value.delete(path);
      if (activeFilePath.value === path) activeFilePath.value = null;
      fileTree.value = fileTree.value.filter((f) => f.path !== path);
    }
    stagedFiles.value = new Map(stagedFiles.value);
    fileTree.value = [...fileTree.value];
  }

  async function duplicateItem(path: string, isFolder: boolean) {
    if (isFolder) return; // complex
    const orig = fileTree.value.find((f) => f.path === path);
    if (!orig) return;
    const parts = path.split("/");
    let name = parts.pop()!;
    const dir = parts.join("/");
    name = name.replace(/\.md$/, "") + "-copy";

    // Quick load if not staged
    if (!stagedFiles.value.has(orig.path)) await openFile(orig);
    const staged = stagedFiles.value.get(orig.path)!;

    let newPath = `${dir}/${name}.md`;
    let counter = 1;
    while (fileTree.value.some((f) => f.path === newPath)) {
      newPath = `${dir}/${name}-${counter}.md`;
      counter++;
    }

    fileTree.value.push({
      path: newPath,
      name: newPath.split("/").pop()!.replace(/\.md$/, ""),
      type: "file",
    });
    stagedFiles.value.set(newPath, {
      ...staged,
      path: newPath,
      sha: null,
      originalContent: "",
      originalFrontmatter: {}, // Force it fully dirty
    });
    stagedFiles.value = new Map(stagedFiles.value);
  }

  async function renameItem(oldPath: string, newPath: string, isFolder: boolean) {
    if (fileTree.value.some((f) => f.path === newPath)) return; // Conflict
    if (isFolder) {
      const prefix = oldPath + "/";
      const newPrefix = newPath + "/";
      const filesToMove = fileTree.value.filter((f) => f.path.startsWith(prefix));
      for (const f of filesToMove) {
        const oldFPath = f.path;
        const np = oldFPath.replace(prefix, newPrefix);
        if (!stagedFiles.value.has(oldFPath)) await openFile(f);

        stagedDeletions.value.add(oldFPath);
        const stg = stagedFiles.value.get(oldFPath);
        if (stg) {
          stagedFiles.value.delete(oldFPath);
          const { newContent, newFm } = adjustDocumentPaths(
            oldFPath,
            np,
            stg.content,
            stg.frontmatter,
          );
          stagedFiles.value.set(np, {
            ...stg,
            path: np,
            sha: null,
            content: newContent,
            frontmatter: newFm,
            originalContent: "",
            originalFrontmatter: {},
          });
        }
        f.path = np;
        f.name = np.split("/").pop()!.replace(/\.md$/, "");
        if (activeFilePath.value === oldFPath) activeFilePath.value = np;
      }

      const cp = config.value?.content_path ?? "";
      const relativeOld = oldPath === cp ? "/" : oldPath.replace(cp + "/", "");
      const relativeNew = newPath === cp ? "/" : newPath.replace(cp + "/", "");
      const relPrefix = relativeOld === "/" ? "" : relativeOld + "/";
      const relNewPrefix = relativeNew === "/" ? "" : relativeNew + "/";

      customFolders.value = customFolders.value.map((cf) => {
        if (cf === relativeOld) return relativeNew;
        if (relPrefix && cf.startsWith(relPrefix)) return cf.replace(relPrefix, relNewPrefix);
        return cf;
      });
    } else {
      if (!stagedFiles.value.has(oldPath)) {
        const node = fileTree.value.find((f) => f.path === oldPath);
        if (node) await openFile(node);
      }

      stagedDeletions.value.add(oldPath);
      const stg = stagedFiles.value.get(oldPath);
      if (stg) {
        stagedFiles.value.delete(oldPath);
        const { newContent, newFm } = adjustDocumentPaths(
          oldPath,
          newPath,
          stg.content,
          stg.frontmatter,
        );
        stagedFiles.value.set(newPath, {
          ...stg,
          path: newPath,
          sha: null,
          content: newContent,
          frontmatter: newFm,
          originalContent: "",
          originalFrontmatter: {},
        });
      }
      const node = fileTree.value.find((f) => f.path === oldPath);
      if (node) {
        node.path = newPath;
        node.name = newPath.split("/").pop()!.replace(/\.md$/, "");
      }
      if (activeFilePath.value === oldPath) activeFilePath.value = newPath;
    }
    stagedFiles.value = new Map(stagedFiles.value);
    fileTree.value = [...fileTree.value];
  }

  async function openFile(node: TreeNode) {
    if (!selectedRepo.value) return;
    activeFilePath.value = node.path;
    activeCarouselKey.value = null;
    if (stagedFiles.value.has(node.path)) return;
    const { owner, name } = selectedRepo.value;
    const res = await auth.githubFetch(`/repos/${owner.login}/${name}/contents/${node.path}`);
    if (!res.ok) throw new Error("Failed to fetch file");
    const data = (await res.json()) as { content: string; sha: string };
    const raw = b64decode(data.content);
    const { frontmatter, body } = parseFrontmatter(raw);
    const clonedFm = JSON.parse(JSON.stringify(frontmatter)) as Record<string, unknown>;
    stagedFiles.value.set(node.path, {
      path: node.path,
      sha: data.sha,
      type: "markdown",
      content: body,
      originalContent: body,
      frontmatter,
      originalFrontmatter: clonedFm,
    });
    stagedFiles.value = new Map(stagedFiles.value);
  }

  function updateFileContent(path: string, content: string) {
    const f = stagedFiles.value.get(path);
    if (!f) return;
    const updated = { ...f, content };
    stagedFiles.value.set(path, updated);
    stagedFiles.value = new Map(stagedFiles.value);
  }

  function updateFrontmatter(path: string, key: string, value: unknown) {
    const f = stagedFiles.value.get(path);
    if (!f) return;
    const updated = { ...f, frontmatter: { ...f.frontmatter, [key]: value } };
    stagedFiles.value.set(path, updated);
    stagedFiles.value = new Map(stagedFiles.value);
  }

  function closeFile(path: string) {
    stagedFiles.value.delete(path);
    stagedFiles.value = new Map(stagedFiles.value);
    if (activeFilePath.value === path) {
      const remaining = [...stagedFiles.value.keys()];
      activeFilePath.value = remaining[remaining.length - 1] ?? null;
    }
  }

  async function loadSettings() {
    if (!selectedRepo.value || !config.value) return;
    try {
      const { owner, name } = selectedRepo.value;
      const res = await auth.githubFetch(
        `/repos/${owner.login}/${name}/contents/${config.value.settings_file}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { content: string; sha: string };
      settingsData.value = JSON.parse(b64decode(data.content)) as Record<string, unknown>;
      settingsSha.value = data.sha;
      settingsDirty.value = false;
    } catch {
      settingsData.value = {};
    }
  }

  function updateSetting(key: string, value: unknown) {
    settingsData.value = { ...settingsData.value, [key]: value };
    settingsDirty.value = true;
  }

  // ─── Carousel operations ──────────────────────────────────────────────────────
  async function openCarousel(key: string) {
    if (!selectedRepo.value || !config.value) return;
    activeCarouselKey.value = key;
    activeFilePath.value = null;

    if (stagedCarousels.value.has(key)) return;

    const carouselConfig = config.value.carousels?.[key];
    if (!carouselConfig) return;

    const jsonPath = `${carouselConfig.path}/carousel.json`;
    try {
      const { owner, name } = selectedRepo.value;
      const res = await auth.githubFetch(`/repos/${owner.login}/${name}/contents/${jsonPath}`);
      if (res.ok) {
        const data = (await res.json()) as { content: string; sha: string };
        const parsed = JSON.parse(b64decode(data.content)) as CarouselData;
        const cloned = JSON.parse(JSON.stringify(parsed)) as CarouselData;
        stagedCarousels.value.set(key, {
          key,
          data: parsed,
          originalData: cloned,
          sha: data.sha,
          dirty: false,
        });
      } else {
        // New carousel — empty data
        const empty: CarouselData = { images: [] };
        stagedCarousels.value.set(key, {
          key,
          data: empty,
          originalData: JSON.parse(JSON.stringify(empty)),
          sha: null,
          dirty: false,
        });
      }
    } catch {
      const empty: CarouselData = { images: [] };
      stagedCarousels.value.set(key, {
        key,
        data: empty,
        originalData: JSON.parse(JSON.stringify(empty)),
        sha: null,
        dirty: false,
      });
    }
    stagedCarousels.value = new Map(stagedCarousels.value);
  }

  function updateCarouselData(key: string, data: CarouselData) {
    const c = stagedCarousels.value.get(key);
    if (!c) return;
    stagedCarousels.value.set(key, { ...c, data, dirty: true });
    stagedCarousels.value = new Map(stagedCarousels.value);
  }

  function updateCarouselMeta(key: string, metaKey: string, value: unknown) {
    const c = stagedCarousels.value.get(key);
    if (!c) return;
    stagedCarousels.value.set(key, {
      ...c,
      data: { ...c.data, [metaKey]: value },
      dirty: true,
    });
    stagedCarousels.value = new Map(stagedCarousels.value);
  }

  async function commit(message: string) {
    if (!selectedRepo.value || !auth.accessToken) throw new Error("Not authenticated");
    const { owner, name, default_branch } = selectedRepo.value;
    const api = async <T>(path: string, options: RequestInit): Promise<T> => {
      const r = await auth.githubFetch(`/repos/${owner.login}/${name}${path}`, options);
      if (!r.ok) throw new Error(`GitHub API error: ${r.status} ${await r.text()}`);
      return r.json() as Promise<T>;
    };
    const refData = await api<{ object: { sha: string } }>(`/git/ref/heads/${default_branch}`, {
      method: "GET",
    });
    const latestSha = refData.object.sha;
    const commitData = await api<{ tree: { sha: string } }>(`/git/commits/${latestSha}`, {
      method: "GET",
    });
    const baseTreeSha = commitData.tree.sha;
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string | null }> = [];

    for (const delPath of stagedDeletions.value) {
      treeItems.push({ path: delPath, mode: "100644", type: "blob", sha: null });
    }

    for (const [, file] of stagedFiles.value) {
      const isDirty =
        file.content !== file.originalContent ||
        JSON.stringify(file.frontmatter) !== JSON.stringify(file.originalFrontmatter);
      if (!isDirty && file.sha !== null) continue;

      let base64Body = "";
      if (file.type === "asset") {
        base64Body = file.content;
      } else {
        const fullContent = serializeFrontmatter(file.frontmatter, file.content);
        base64Body = b64encode(fullContent);
      }

      const blob = await api<{ sha: string }>(`/git/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: base64Body, encoding: "base64" }),
      });
      treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    if (settingsDirty.value && config.value && config.value.settings_file) {
      const json = JSON.stringify(settingsData.value, null, 2);
      const blob = await api<{ sha: string }>(`/git/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: b64encode(json), encoding: "base64" }),
      });
      treeItems.push({
        path: config.value.settings_file,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    // Commit carousel changes
    for (const [, carousel] of stagedCarousels.value) {
      if (!carousel.dirty) continue;
      const carouselConfig = config.value?.carousels?.[carousel.key];
      if (!carouselConfig) continue;
      const jsonPath = `${carouselConfig.path}/carousel.json`;
      const json = JSON.stringify(carousel.data, null, 2);
      const blob = await api<{ sha: string }>(`/git/blobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: b64encode(json), encoding: "base64" }),
      });
      treeItems.push({ path: jsonPath, mode: "100644", type: "blob", sha: blob.sha });
    }

    if (treeItems.length === 0) return;

    const newTree = await api<{ sha: string }>(`/git/trees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    const newCommit = await api<{ sha: string }>(`/git/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, tree: newTree.sha, parents: [latestSha] }),
    });
    await api(`/git/refs/heads/${default_branch}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommit.sha }),
    });

    for (const [path, file] of stagedFiles.value) {
      const activeSha = treeItems.find((i) => i.path === path)?.sha ?? file.sha;
      stagedFiles.value.set(path, {
        ...file,
        originalContent: file.content,
        sha: activeSha,
        originalFrontmatter: JSON.parse(JSON.stringify(file.frontmatter)) as Record<
          string,
          unknown
        >,
      });
    }
    stagedDeletions.value.clear();
    stagedFiles.value = new Map(stagedFiles.value);
    settingsDirty.value = false;

    for (const [key, carousel] of stagedCarousels.value) {
      stagedCarousels.value.set(key, {
        ...carousel,
        originalData: JSON.parse(JSON.stringify(carousel.data)),
        dirty: false,
      });
    }
    stagedCarousels.value = new Map(stagedCarousels.value);
  }

  // ─── Workspace Automatic Persistence ──────────────────────────────────────────
  watch(
    [stagedFiles, stagedDeletions, customFolders, settingsData, settingsDirty, stagedCarousels],
    () => {
      if (!selectedRepo.value) return;
      const key = `liteditor_workspace_${selectedRepo.value.full_name}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          stagedFiles: Array.from(stagedFiles.value.entries()),
          stagedDeletions: Array.from(stagedDeletions.value),
          customFolders: customFolders.value,
          settingsData: settingsData.value,
          settingsDirty: settingsDirty.value,
          settingsSha: settingsSha.value,
          stagedCarousels: Array.from(stagedCarousels.value.entries()),
        }),
      );
    },
    { deep: true },
  );

  return {
    repos,
    reposLoading,
    selectedRepo,
    config,
    configError,
    configLoading,
    fileTree,
    treeLoading,
    customFolders,
    assetTree,
    stagedFiles,
    stagedDeletions,
    activeFilePath,
    activeFile,
    settingsData,
    settingsSha,
    settingsDirty,
    hasStagedChanges,
    stagedCarousels,
    activeCarouselKey,
    activeCarousel,
    githubActionStatus,
    fetchRepos,
    selectRepo,
    loadConfig,
    createFile,
    openFile,
    updateFileContent,
    deleteItem,
    duplicateItem,
    renameItem,
    fetchActionStatus,
    updateFrontmatter,
    closeFile,
    loadSettings,
    updateSetting,
    commit,
    openCarousel,
    updateCarouselData,
    updateCarouselMeta,
    uploadAsset,
    deleteAsset,
    renameAsset,
    moveAsset,
  };
});
