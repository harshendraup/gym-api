import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { TenantException } from '#exceptions/tenant.exception'

/**
 * Base repository that enforces multi-tenant isolation.
 * Every query through this base automatically scopes to the current gym.
 *
 * Subclasses must set `model` and call `super(gymId)`.
 */
export abstract class BaseRepository<T extends LucidModel> {
  protected gymId: string

  constructor(gymId: string) {
    if (!gymId) {
      throw new TenantException('Repository instantiated without gymId — tenant isolation violated.')
    }
    this.gymId = gymId
  }

  protected abstract get model(): T

  /**
   * Returns a scoped query builder pre-filtered by gym_id.
   * All public methods MUST use this — never call model.query() directly.
   */
  protected query(): ModelQueryBuilderContract<T> {
    return this.model.query().where('gym_id', this.gymId) as ModelQueryBuilderContract<T>
  }

  async findById(id: string): Promise<InstanceType<T> | null> {
    return this.query().where('id', id).first() as Promise<InstanceType<T> | null>
  }

  async findByIdOrFail(id: string): Promise<InstanceType<T>> {
    const record = await this.findById(id)
    if (!record) {
      throw new Error(`Record ${id} not found in gym ${this.gymId}`)
    }
    return record
  }

  async paginate(page: number, perPage: number) {
    return this.query().paginate(page, perPage)
  }

  /**
   * Safety check: ensure a given record actually belongs to this gym.
   * Throws 403 (not 404) to prevent enumeration attacks.
   */
  async assertOwnership(id: string): Promise<void> {
    const record = await this.model.query().where('id', id).first()
    if (!record || record['gymId'] !== this.gymId) {
      throw new TenantException(`Cross-tenant access attempt: record ${id} does not belong to gym ${this.gymId}`)
    }
  }
}
