import * as React from 'react';
import { ResourceSummary, NodeLink, ResourceLink } from '@console/internal/components/utils';
import { PodKind } from '@console/internal/module/k8s';
import { getName, getNamespace, getNodeName } from '@console/shared';
import { PodModel } from '@console/internal/models';
import { VMKind, VMIKind } from '../../types';
import { VMTemplateLink } from '../vm-templates/vm-template-link';
import { getBasicID, prefixedID } from '../../utils';
import { vmDescriptionModal, vmFlavorModal } from '../modals';
import { VMCDRomModal } from '../modals/cdrom-vm-modal';
import { DedicatedResourcesModal } from '../modals/dedicated-resources-modal/dedicated-resources-modal';
import { BootOrderModal } from '../modals/boot-order-modal/boot-order-modal';
import VMStatusModal from '../modals/vm-status-modal/vm-status-modal';
import { getDescription } from '../../selectors/selectors';
import { getCDRoms, isDedicatedCPUPlacement } from '../../selectors/vm/selectors';
import { getVMTemplateNamespacedName } from '../../selectors/vm-template/selectors';
import { getFlavorText } from '../flavor-text';
import { EditButton } from '../edit-button';
import { VMStatuses } from '../vm-status';
import { DiskSummary } from '../vm-disks/disk-summary';
import { BootOrderSummary } from '../boot-order';
import {
  RESOURCE_PINNED,
  RESOURCE_NOT_PINNED,
  DEDICATED_RESOURCES,
} from '../modals/dedicated-resources-modal/consts';
import {
  getOperatingSystemName,
  getOperatingSystem,
  getWorkloadProfile,
  getDevices,
} from '../../selectors/vm';
import { getVmiIpAddresses } from '../../selectors/vmi/ip-address';
import { findVMPod } from '../../selectors/pod/selectors';
import { isVMIPaused } from '../../selectors/vmi';

import './vm-resource.scss';

export const VMDetailsItem: React.FC<VMDetailsItemProps> = ({
  title,
  canEdit = false,
  editButtonId,
  onEditClick,
  idValue,
  isNotAvail = false,
  valueClassName,
  children,
}) => {
  return (
    <>
      <dt>
        {title} <EditButton id={editButtonId} canEdit={canEdit} onClick={onEditClick} />
      </dt>
      <dd id={idValue} className={valueClassName}>
        {isNotAvail ? <span className="text-secondary">Not available</span> : children}
      </dd>
    </>
  );
};

export const VMResourceSummary: React.FC<VMResourceSummaryProps> = ({ vm, vmi, canUpdateVM }) => {
  const vmLike = vm || vmi;

  const templateNamespacedName = getVMTemplateNamespacedName(vmLike);
  const id = getBasicID(vmLike);
  const description = getDescription(vmLike);
  const os = getOperatingSystemName(vmLike) || getOperatingSystem(vmLike);

  return (
    <ResourceSummary resource={vmLike}>
      <VMDetailsItem
        title="Description"
        idValue={prefixedID(id, 'description')}
        valueClassName="kubevirt-vm-resource-summary__description"
        isNotAvail={!description}
      >
        <EditButton
          canEdit={canUpdateVM}
          onClick={() => vmDescriptionModal({ vmLikeEntity: vmLike })}
        >
          {description}
        </EditButton>
      </VMDetailsItem>

      <VMDetailsItem title="Operating System" idValue={prefixedID(id, 'os')} isNotAvail={!os}>
        {os}
      </VMDetailsItem>

      <VMDetailsItem
        title="Template"
        idValue={prefixedID(id, 'template')}
        isNotAvail={!templateNamespacedName}
      >
        {templateNamespacedName && <VMTemplateLink {...templateNamespacedName} />}
      </VMDetailsItem>
    </ResourceSummary>
  );
};

export const VMDetailsList: React.FC<VMResourceListProps> = ({
  vm,
  vmi,
  pods,
  migrations,
  canUpdateVM,
}) => {
  const [isBootOrderModalOpen, setBootOrderModalOpen] = React.useState<boolean>(false);
  const [isDedicatedResourcesModalOpen, setDedicatedResourcesModalOpen] = React.useState<boolean>(
    false,
  );
  const vmLike = vm || vmi;
  const [isStatusModalOpen, setStatusModalOpen] = React.useState<boolean>(false);

  const launcherPod = findVMPod(vmLike, pods);
  const id = getBasicID(vmLike);
  const cds = getCDRoms(vmLike);
  const devices = getDevices(vmLike);
  const nodeName = getNodeName(launcherPod);
  const ipAddrs = getVmiIpAddresses(vmi).join(', ');
  const workloadProfile = getWorkloadProfile(vm);
  const flavorText = getFlavorText(vm);
  const isCPUPinned = isDedicatedCPUPlacement(vm);

  return (
    <dl className="co-m-pane__details">
      <VMDetailsItem
        title="Status"
        canEdit={isVMIPaused(vmi)}
        editButtonId={prefixedID(id, 'status-edit')}
        onEditClick={() => setStatusModalOpen(true)}
        idValue={prefixedID(id, 'vm-statuses')}
      >
        <VMStatusModal isOpen={isStatusModalOpen} setOpen={setStatusModalOpen} vmi={vmi} />
        <VMStatuses vm={vm} vmi={vmi} pods={pods} migrations={migrations} />
      </VMDetailsItem>

      <VMDetailsItem title="Pod" idValue={prefixedID(id, 'pod')} isNotAvail={!launcherPod}>
        {launcherPod && (
          <ResourceLink
            kind={PodModel.kind}
            name={getName(launcherPod)}
            namespace={getNamespace(launcherPod)}
          />
        )}
      </VMDetailsItem>

      <VMDetailsItem
        title="Boot Order"
        canEdit={!!vm}
        editButtonId={prefixedID(id, 'boot-order-edit')}
        onEditClick={() => setBootOrderModalOpen(true)}
        idValue={prefixedID(id, 'boot-order')}
      >
        <BootOrderModal
          isOpen={isBootOrderModalOpen}
          setOpen={setBootOrderModalOpen}
          vmLikeEntity={vm}
        />
        <BootOrderSummary devices={devices} />
      </VMDetailsItem>

      <VMDetailsItem
        title="CD-ROMs"
        canEdit={canUpdateVM}
        editButtonId={prefixedID(id, 'cdrom-edit')}
        onEditClick={() => VMCDRomModal({ vmLikeEntity: vm, modalClassName: 'modal-lg' })}
        idValue={prefixedID(id, 'cdrom')}
        isNotAvail={cds.length === 0}
      >
        <DiskSummary disks={cds} vm={vm} />
      </VMDetailsItem>

      <VMDetailsItem
        title="IP Address"
        idValue={prefixedID(id, 'ip-addresses')}
        isNotAvail={!ipAddrs}
      >
        {ipAddrs}
      </VMDetailsItem>

      <VMDetailsItem title="Node" idValue={prefixedID(id, 'node')} isNotAvail={!nodeName}>
        {nodeName && <NodeLink name={nodeName} />}
      </VMDetailsItem>

      <VMDetailsItem title="Flavor" idValue={prefixedID(id, 'flavor')} isNotAvail={!flavorText}>
        <EditButton
          id={prefixedID(id, 'flavor-edit')}
          canEdit={canUpdateVM}
          onClick={() => vmFlavorModal({ vmLike: vm })}
        >
          {flavorText}
        </EditButton>
      </VMDetailsItem>

      <VMDetailsItem
        title={DEDICATED_RESOURCES}
        idValue={prefixedID(id, 'dedicated-resources')}
        canEdit={!!vm}
        onEditClick={() => setDedicatedResourcesModalOpen(true)}
        editButtonId={prefixedID(id, 'dedicated-resources-edit')}
      >
        <DedicatedResourcesModal
          vmLikeEntity={vm}
          isOpen={isDedicatedResourcesModalOpen}
          setOpen={setDedicatedResourcesModalOpen}
        />
        {isCPUPinned ? RESOURCE_PINNED : RESOURCE_NOT_PINNED}
      </VMDetailsItem>

      <VMDetailsItem
        title="Workload Profile"
        idValue={prefixedID(id, 'workload-profile')}
        isNotAvail={!workloadProfile}
      >
        {workloadProfile}
      </VMDetailsItem>
    </dl>
  );
};

type VMDetailsItemProps = {
  title: string;
  canEdit?: boolean;
  editButtonId?: string;
  onEditClick?: () => void;
  idValue?: string;
  isNotAvail?: boolean;
  valueClassName?: string;
  children: React.ReactNode;
};

type VMResourceSummaryProps = {
  vm?: VMKind;
  vmi?: VMIKind;
  canUpdateVM: boolean;
};

type VMResourceListProps = {
  vm?: VMKind;
  pods?: PodKind[];
  migrations?: any[];
  vmi?: VMIKind;
  canUpdateVM: boolean;
};
