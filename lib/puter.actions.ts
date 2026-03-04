import { puter } from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
}

function resolveImageUrl(
  hosted: { url: string } | null,
  fallback: string | null | undefined,
): string | null {
  if (hosted?.url) return hosted.url;
  if (fallback != null && isHostedUrl(fallback)) return fallback;
  return null;
}

export const createProject = async ({ item }: CreateProjectParams): Promise<DesignItem | null> => {
  const projectId = item.id;
  const hosting = await getOrCreateHostingConfig();

  const [hostedSource, hostedRender] = await Promise.all([
    projectId
      ? uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: "source" })
      : null,
    projectId && item.renderedImage
      ? uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: "rendered" })
      : null,
  ]);

  const resolvedSource = resolveImageUrl(hostedSource, item.sourceImage) ?? item.sourceImage;
  const resolvedRender = resolveImageUrl(hostedRender, item.renderedImage) ?? item.renderedImage ?? null;

  if (!resolvedSource) {
    console.warn("Cannot create project without a resolved source image.");
    return null;
  }

  const { sourcePath: _s, renderedPath: _r, publicPath: _p, ...rest } = item;

  try {
    const payload: DesignItem = {
      ...rest,
      sourceImage: resolvedSource,
      renderedImage: resolvedRender,
    };
    // Call the Puter worker to store project in kv
    return payload;
  } catch (e) {
    console.log(`Failed to save project: ${e}`);
    return null;
  }
}