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

const mapRowToMediaItem = (row) => {
  const processingStatus = row.processing_status ?? null;
  const processingResult = row.processing_result ?? null;
  const normalizedStatus = processingStatus ? String(processingStatus).toLowerCase() : null;

  let mediaStatus = 'open';
  if (normalizedStatus === 'completed') {
    mediaStatus = 'ingested';
  } else if (normalizedStatus === 'queued') {
    mediaStatus = 'enqueued';
  } else if (['downloading', 'encoding', 'processing'].includes(normalizedStatus)) {
    mediaStatus = 'processing';
  } else if (normalizedStatus === 'failed') {
    mediaStatus = 'failed';
  }

  return {
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
    rawMetadata: Array.isArray(row.raw_metadata) ? row.raw_metadata : row.raw_metadata ?? [],
    processingStatus,
    mediaStatus,
    processingResult,
    processingUpdatedAt: row.processing_updated_at ?? null,
    processingCompletedAt: row.processing_completed_at ?? null
  };
};

const baseSelectQuery = `
  SELECT
    mi.id,
    mi.ref,
    mi.page,
    mi.position_on_page,
    mi.title,
    mi.extension,
    mi.list_date,
    mi.detail_date,
    mi.effective_date,
    mi.primary_video_url,
    mi.video_urls,
    mi.resource_id,
    mi.access,
    mi.contributed_by,
    mi.keywords,
    mi.ole_course_code,
    mi.ole_term_code,
    mi.raw_metadata,
    pj.processing_status,
    pj.processing_result,
    pj.processing_updated_at,
    pj.processing_completed_at
  FROM media_items mi
  LEFT JOIN LATERAL (
    SELECT
      pj.status AS processing_status,
      pj.result AS processing_result,
      pj.updated_at AS processing_updated_at,
      pj.completed_at AS processing_completed_at
    FROM processing_jobs pj
    WHERE pj.media_item_id = mi.id OR (pj.ref IS NOT NULL AND pj.ref = mi.ref)
    ORDER BY pj.updated_at DESC
    LIMIT 1
  ) pj ON TRUE
`;

const buildSearchFilter = (search, startingIndex = 1) => {
  if (!search || !search.trim()) {
    return { clause: '', params: [] };
  }

  const term = `%${search.trim()}%`;
  const placeholder = `$${startingIndex}`;
  const clause = `
    WHERE (
      COALESCE(mi.title, '') ||
      ' ' ||
      COALESCE(mi.ref, '') ||
      ' ' ||
      COALESCE(mi.resource_id, '') ||
      ' ' ||
      COALESCE(mi.access, '') ||
      ' ' ||
      COALESCE(mi.contributed_by, '') ||
      ' ' ||
      COALESCE(mi.ole_course_code, '') ||
      ' ' ||
      COALESCE(mi.ole_term_code, '') ||
      ' ' ||
      COALESCE(array_to_string(mi.keywords, ' '), '')
    ) ILIKE ${placeholder}
  `;

  return { clause, params: [term] };
};

export const getAllMediaItems = async ({ search, page = 1, pageSize = 20 } = {}) => {
  const requestedPage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const requestedPageSizeRaw = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 20;
  const normalizedPageSize = Math.min(requestedPageSizeRaw, 200);

  const { clause, params } = buildSearchFilter(search);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM media_items mi
    ${clause};
  `;

  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = total === 0 ? 1 : Math.min(requestedPage, totalPages);
  const offset = (normalizedPage - 1) * normalizedPageSize;

  const orderClause = `
    ORDER BY
      mi.page NULLS LAST,
      mi.position_on_page NULLS LAST,
      mi.title ASC
  `;

  const limitPlaceholder = `$${params.length + 1}`;
  const offsetPlaceholder = `$${params.length + 2}`;

  const dataQuery = `
    ${baseSelectQuery}
    ${clause}
    ${orderClause}
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder};
  `;

  const dataResult = await pool.query(dataQuery, [...params, normalizedPageSize, offset]);

  return {
    items: dataResult.rows.map(mapRowToMediaItem),
    total,
    page: total === 0 ? 1 : normalizedPage,
    pageSize: normalizedPageSize
  };
};

export const getMediaItemById = async (id) => {
  const result = await pool.query(`${baseSelectQuery} WHERE mi.id = $1`, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToMediaItem(result.rows[0]);
};

export const getMediaItemByRef = async (ref) => {
  const normalizedRef = `${ref ?? ''}`.trim();

  if (!normalizedRef) {
    return null;
  }

  const result = await pool.query(`${baseSelectQuery} WHERE mi.ref = $1`, [normalizedRef]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToMediaItem(result.rows[0]);
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
