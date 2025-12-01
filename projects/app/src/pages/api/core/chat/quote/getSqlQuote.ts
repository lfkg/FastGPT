import { NextAPI } from '@/service/middleware/entry';
import { authChatCrud, authCollectionInChat } from '@/service/support/permission/auth/chat';
import { type DatasetCiteItemType } from '@fastgpt/global/core/dataset/type';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { ChatErrEnum } from '@fastgpt/global/common/error/code/chat';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { DatasetErrEnum } from '@fastgpt/global/common/error/code/dataset';

/**
 * Get SQL query quote details for database and structureDocument type datasets
 * This endpoint retrieves SQL generation results from chat history
 */
export type GetSqlQuoteProps = {
  chatId: string;
  chatItemDataId: string;
  datasetId: string; // Dataset ID extracted from sourceId (format: ${datasetType}_quote_${datasetId})

  appId: string;
  shareId?: string;
  outLinkUid?: string;
  teamId?: string;
  teamToken?: string;
};

export type GetSqlQuoteRes = Omit<DatasetCiteItemType, 'index'> | null;

async function handler(req: ApiRequestProps<GetSqlQuoteProps>): Promise<GetSqlQuoteRes> {
  const { appId, chatId, chatItemDataId, datasetId, shareId, outLinkUid, teamId, teamToken } =
    req.body;

  if (!datasetId) {
    return null;
  }

  // Parallel authentication and data fetching (following getCollectionQuote pattern)
  const [dataset, { chat, showRawSource }, { chatItem }] = await Promise.all([
    MongoDataset.findById(datasetId, 'name updateTime teamId').lean(),
    authChatCrud({
      req,
      authToken: true,
      appId,
      chatId,
      shareId,
      outLinkUid,
      teamId,
      teamToken
    }),
    authCollectionInChat({ appId, chatId, chatItemDataId, collectionIds: [''] })
  ]);

  if (!showRawSource) {
    return Promise.reject(ChatErrEnum.unAuthChat);
  }

  if (!chat) {
    return Promise.reject(ChatErrEnum.unAuthChat);
  }

  if (!dataset) {
    return Promise.reject(DatasetErrEnum.unExist);
  }

  // Extract dataset search node results from chat response
  const datasetSearchItems = chatItem.responseData?.filter(
    (e) => e.moduleType === FlowNodeTypeEnum.datasetSearchNode
  );

  if (!datasetSearchItems || datasetSearchItems.length === 0) {
    return null;
  }

  // Search for SQL result matching the specified datasetId
  let sqlResult = null;
  let quoteInfo = null;

  for (const item of datasetSearchItems) {
    const sqlResults = item.sqlResult || [];
    const quoteList = item.quoteList || [];

    // Find matching SQL result and quote info
    const matchedSqlResult = sqlResults.find((res) => res?.datasetId === datasetId);
    const matchedQuote = quoteList.find((quote) => quote?.datasetId === datasetId);

    if (matchedSqlResult) {
      sqlResult = matchedSqlResult;
      quoteInfo = matchedQuote;
      break;
    }
  }

  if (!sqlResult) {
    return null;
  }

  // Return formatted citation matching DatasetCiteItemType structure
  return {
    _id: quoteInfo?.id || `unknown_dataset_${datasetId}`,
    q: sqlResult.answer || '',
    a: sqlResult.sql || '',
    updateTime: dataset.updateTime || chatItem.time
  };
}

export default NextAPI(handler);
