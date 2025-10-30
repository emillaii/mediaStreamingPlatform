import { pool } from '../db/pool.js';

const toArrayOfStrings = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
};

const parseInteger = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getFirstMetadataValue = (metadata, key) => {
  const value = metadata?.[key];

  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
};

const normalizeMetadataEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const metadata = entry.metadata ?? {};

  const fallbackId = `${entry.page ?? 'page'}-${entry.positionOnPage ?? Date.now()}`;
  const id = entry.ref ?? entry.id ?? fallbackId;

  const normalizedMetadataFields = Object.entries(metadata).map(([label, values]) => ({
    label,
    values: toArrayOfStrings(values)
  }));

  return {
    id,
    ref: entry.ref ?? null,
    page: parseInteger(entry.page),
    positionOnPage: parseInteger(entry.positionOnPage),
    title: entry.title?.trim() || 'Untitled',
    extension: entry.extension ?? null,
    listDate: entry.listDate ?? null,
    detailDate: entry.detailDate ?? null,
    effectiveDate: entry.effectiveDate ?? null,
    primaryVideoUrl: entry.primaryVideoUrl ?? null,
    videoUrls: Array.isArray(entry.videoUrls) ? entry.videoUrls.filter(Boolean) : [],
    resourceId: getFirstMetadataValue(metadata, 'Resource ID'),
    access: getFirstMetadataValue(metadata, 'Access'),
    contributedBy: getFirstMetadataValue(metadata, 'Contributed by'),
    keywords: toArrayOfStrings(metadata['Keywords']),
    oleCourseCode: getFirstMetadataValue(metadata, 'OLE Course Code'),
    oleTermCode: getFirstMetadataValue(metadata, 'OLE Term Code'),
    rawMetadata: normalizedMetadataFields
  };
};

const mapRowToMediaItem = (row) => ({
  id: row.id,
  ref: row.ref,
  page: row.page,
  positionOnPage: row.position_on_page,
  title: row.title,
  extension: row.extension,
  listDate: row.list_date,
  detailDate: row.detail_date,
  effectiveDate: row.effective_date,
  primaryVideoUrl: row.primary_video_url,
  videoUrls: row.video_urls ?? [],
  resourceId: row.resource_id,
  access: row.access,
  contributedBy: row.contributed_by,
  keywords: row.keywords ?? [],
  oleCourseCode: row.ole_course_code,
  oleTermCode: row.ole_term_code,
  rawMetadata: Array.isArray(row.raw_metadata) ? row.raw_metadata : row.raw_metadata ?? []
});

const buildSearchFilter = (search) => {
  if (!search || !search.trim()) {
    return { clause: '', params: [] };
  }

  const term = `%${search.trim()}%`;
  const clause = `
    WHERE (
      COALESCE(title, '') ||
      ' ' ||
      COALESCE(ref, '') ||
      ' ' ||
      COALESCE(resource_id, '') ||
      ' ' ||
      COALESCE(access, '') ||
      ' ' ||
      COALESCE(contributed_by, '') ||
      ' ' ||
      COALESCE(ole_course_code, '') ||
      ' ' ||
      COALESCE(ole_term_code, '') ||
      ' ' ||
      COALESCE(array_to_string(keywords, ' '), '')
    ) ILIKE $1
  `;

  return { clause, params: [term] };
};

export const getAllMediaItems = async ({ search } = {}) => {
  const { clause, params } = buildSearchFilter(search);

  const query = `
    SELECT
      id,
      ref,
      page,
      position_on_page,
      title,
      extension,
      list_date,
      detail_date,
      effective_date,
      primary_video_url,
      video_urls,
      resource_id,
      access,
      contributed_by,
      keywords,
      ole_course_code,
      ole_term_code,
      raw_metadata
    FROM media_items
    ${clause}
    ORDER BY
      page NULLS LAST,
      position_on_page NULLS LAST,
      title ASC;
  `;

  const result = await pool.query(query, params);
  return result.rows.map(mapRowToMediaItem);
};

export const upsertMediaEntries = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { imported: 0, invalid: entries ? 1 : 0 };
  }

  const client = await pool.connect();

  let imported = 0;
  let invalid = 0;

  try {
    await client.query('BEGIN');

    for (const entry of entries) {
      const normalized = normalizeMetadataEntry(entry);

      if (!normalized) {
        invalid += 1;
        continue;
      }

      const values = [
        normalized.id,
        normalized.ref,
        normalized.page,
        normalized.positionOnPage,
        normalized.title,
        normalized.extension,
        normalized.listDate,
        normalized.detailDate,
        normalized.effectiveDate,
        normalized.primaryVideoUrl,
        normalized.videoUrls,
        normalized.resourceId,
        normalized.access,
        normalized.contributedBy,
        normalized.keywords,
        normalized.oleCourseCode,
        normalized.oleTermCode,
        JSON.stringify(normalized.rawMetadata)
      ];

      await client.query(
        `
          INSERT INTO media_items (
            id,
            ref,
            page,
            position_on_page,
            title,
            extension,
            list_date,
            detail_date,
            effective_date,
            primary_video_url,
            video_urls,
            resource_id,
            access,
            contributed_by,
            keywords,
            ole_course_code,
            ole_term_code,
            raw_metadata
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11::text[],
            $12,
            $13,
            $14,
            $15::text[],
            $16,
            $17,
            $18::jsonb
          )
          ON CONFLICT (id) DO UPDATE SET
            ref = EXCLUDED.ref,
            page = EXCLUDED.page,
            position_on_page = EXCLUDED.position_on_page,
            title = EXCLUDED.title,
            extension = EXCLUDED.extension,
            list_date = EXCLUDED.list_date,
            detail_date = EXCLUDED.detail_date,
            effective_date = EXCLUDED.effective_date,
            primary_video_url = EXCLUDED.primary_video_url,
            video_urls = EXCLUDED.video_urls,
            resource_id = EXCLUDED.resource_id,
            access = EXCLUDED.access,
            contributed_by = EXCLUDED.contributed_by,
            keywords = EXCLUDED.keywords,
            ole_course_code = EXCLUDED.ole_course_code,
            ole_term_code = EXCLUDED.ole_term_code,
            raw_metadata = EXCLUDED.raw_metadata,
            updated_at = NOW();
        `,
        values
      );

      imported += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { imported, invalid };
};
