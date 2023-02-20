const { HttpError } = require("../../../utils/httpError");
const { isUniquesChain, isAssetsChain } = require("../../../env");
const { normalizeData } = require("./common");
const {
  account: { getAddressCollection },
  asset: { getAssetHolderCol, getTransferCollection },
  block: { getExtrinsicCollection },
  uniques: { getInstanceCol, getInstanceTransferCol },
} = require("@statescan/mongo");

async function countAccountAssets(address) {
  const col = await getAssetHolderCol();
  return await col.countDocuments({ address });
}

async function countAccountTransfers(address) {
  const col = await getTransferCollection();
  return await col.countDocuments({
    $or: [{ from: address }, { to: address }],
  });
}

async function countAccountExtrinsics(address) {
  const col = await getExtrinsicCollection();
  return await col.countDocuments({ signer: address });
}

async function countAccountNftInstances(address) {
  const col = await getInstanceCol();
  return await col.countDocuments({
    "details.owner": address,
    isDestroyed: false,
  });
}

async function countAccountNftTransfers(address) {
  const col = await getInstanceTransferCol();
  return await col.countDocuments({
    $or: [{ from: address }, { to: address }],
  });
}

async function getAccount(ctx) {
  const { address } = ctx.params;
  const col = await getAddressCollection();
  const account = await col.findOne({ address }, { projection: { _id: 0 } });
  if (!account) {
    throw new HttpError(404, "account not found");
  }

  const transfersCount = await countAccountTransfers(address);
  const extrinsicsCount = await countAccountExtrinsics(address);

  let assetCounts = {};
  if (isAssetsChain()) {
    const assetsCount = await countAccountAssets(address);
    assetCounts = { assetsCount };
  }

  let nftCounts = {};
  if (isUniquesChain()) {
    const nftInstancesCount = await countAccountNftInstances(address);
    const nftTransfersCount = await countAccountNftTransfers(address);
    nftCounts = {
      nftInstancesCount,
      nftTransfersCount,
    };
  }

  ctx.body = {
    ...account,
    data: normalizeData(account.data),
    transfersCount,
    extrinsicsCount,
    ...assetCounts,
    ...nftCounts,
  };
}

module.exports = {
  getAccount,
};
